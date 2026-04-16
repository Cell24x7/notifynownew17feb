const { Worker } = require('bullmq');
const { redisConnection } = require('./campaignQueue');
const { query } = require('../config/db');
const Redis = require('ioredis');

// CREATE REUSABLE REDIS FOR COUNTERS
const redis = new Redis(redisConnection);

// Error handlers to prevent local crashes on Windows
redis.on('error', (err) => {
    if (process.env.NODE_ENV !== 'production' || (process.cwd().includes('C:') || process.cwd().includes('Users'))) {
        // Silence local Redis errors so app doesn't crash on Windows
    } else {
        console.error('❌ Redis Connection Error:', err.message);
    }
});

// AUTO-RECOVERY: Clean up stuck jobs on startup
async function rescueStuckJobsOnStartup() {
    try {
        const [res] = await query('UPDATE campaign_queue SET status = "pending" WHERE status = "processing" AND updated_at < DATE_SUB(NOW(), INTERVAL 15 MINUTE)');
        if (res.affectedRows > 0) {
            // console.log(`[Rescue] Automatically recovered ${res.affectedRows} stuck processing jobs.`);
        }
    } catch (e) {
        console.error('[Rescue] Startup recovery failed:', e.message);
    }
}
rescueStuckJobsOnStartup();

const envSuffix = (process.env.APP_NAME || 'notifynow').replace(/-developer|-production/g, '');
const queueName = `campaign-sending-${envSuffix}`;

const campaignWorker = new Worker(queueName, async (job) => {
    const { item, tableConfig } = job.data;
    const { queueTable, campaignTable, logsTable } = tableConfig;
    let result = { success: false, error: 'Unknown' };

    try {
        // 0. IDEMPOTENCY CHECK (CRITICAL: prevent double sending on retries)
        const [check] = await query(`SELECT status FROM ${queueTable} WHERE id = ?`, [item.id]);
        if (check.length > 0 && (check[0].status === 'sent' || check[0].status === 'failed')) {
            // console.log(`[Worker] Skipping job ${job.id} for ${item.mobile} - Already processed (Status: ${check[0].status})`);
            return;
        }

        // Pre-calculate status independent variables
        const now = new Date();
        const campId = item.campaign_id;
        const chan = (item.channel || 'rcs').toLowerCase();
        const tName = item.template_name || 'N/A';
        const cName = item.campaign_name || 'N/A';
        const msgContent = item.template_body || item.campaign_name || 'Template Message';

        // 1. Process Message
        const { sendUniversalMessage } = require('../services/sendingService');
        result = await sendUniversalMessage(item);

        // Safety: ensure logsTable is correct for API campaigns
        let effectiveLogsTable = logsTable;
        if (campId && String(campId).startsWith('CAMP_API_')) {
            effectiveLogsTable = 'api_message_logs';
        } else if (!effectiveLogsTable) {
            effectiveLogsTable = 'message_logs';
        }

        // 2. LOG TO DATABASE IMMEDIATELY (Before status updates)
        // This ensures the log exists before webhooks arrive.
        if (result.success) {
            try {
                // Mandatory log to message_logs
                await query(
                    `INSERT INTO ${effectiveLogsTable} (user_id, campaign_id, campaign_name, recipient, status, message_id, channel, template_name, message_content, send_time, is_failover_enabled, failover_sms_template) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
                    [item.user_id || job.data.item.user_id, campId, cName, item.mobile, 'sent', result.messageId, chan, tName, result.processedMessage || msgContent, now, item.is_failover_enabled || 0, item.failover_sms_template || null]
                );

                // Secondary log to webhook_logs for Chat UI
                await query(
                    `INSERT INTO webhook_logs (user_id, recipient, message_id, status, event_type, type, channel, message_content, campaign_id, campaign_name, template_name, raw_payload, created_at) 
                     VALUES (?, ?, ?, 'sent', 'SENT', ?, ?, ?, ?, ?, ?, ?, NOW())`,
                    [item.user_id || job.data.item.user_id, item.mobile, result.messageId, chan, chan, msgContent, campId, cName, tName, JSON.stringify({ note: 'Campaign Message', item_id: item.id })]
                ).catch(() => {});
            } catch (logErr) {
                console.error(`[Worker] DB INSERT FAIL for ${item.mobile}: ${logErr.message}`);
                // Continue to update queue even if log fail (better than sending twice on retry)
            }

            // 3. Update status in Queue & Redis stats
            await query(`UPDATE ${queueTable} SET status = "sent", message_id = ?, updated_at = NOW() WHERE id = ?`, [result.messageId, item.id]);
            
            const isNew = await redis.sadd(`${envSuffix}:tracked:${campId}`, item.id);
            if (isNew) {
                await redis.hincrby(`${envSuffix}:stats:${campId}`, 'sent', 1);
            }

        } else {
            console.error(`❌ Campaign ${campId} failed for ${item.mobile}:`, result.error);
            
            // Log the failure to message_logs so user knows why it failed
            try {
                await query(
                    `INSERT INTO ${effectiveLogsTable} (user_id, campaign_id, campaign_name, recipient, status, channel, template_name, send_time, failure_reason, is_failover_enabled, failover_sms_template) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
                    [item.user_id || job.data.item.user_id, campId, cName, item.mobile, 'failed', chan, tName, now, String(result.error || 'Provider rejected').slice(0, 1000), item.is_failover_enabled || 0, item.failover_sms_template || null]
                );
            } catch (failLogErr) {
                console.error(`[Worker] FAILURE LOG FAIL for ${item.mobile}: ${failLogErr.message}`);
            }

            await query(`UPDATE ${queueTable} SET status = "failed", updated_at = NOW() WHERE id = ?`, [item.id]);

            const isNewFail = await redis.sadd(`${envSuffix}:tracked_fail:${campId}`, item.id);
            if (isNewFail) {
                await redis.hincrby(`${envSuffix}:stats:${campId}`, 'failed', 1);
            }
        }

        // 3. OPTIMIZED BATCH SYNC (Avoid Row Contention)
        const processedTotal = await redis.hincrby(`${envSuffix}:stats:${campId}`, 'total_processed', 1);
        
        // DYNAMIC SYNC: Sync every 10 for small campaigns, every 500 for large ones
        const syncInterval = (processedTotal < 100) ? 10 : 500;
        if (processedTotal % syncInterval === 0) {
            const stats = await redis.hgetall(`${envSuffix}:stats:${campId}`);
            const totalSent = parseInt(stats.sent || 0) + parseInt(stats.failed || 0);
            await query(`UPDATE ${campaignTable} SET sent_count = ?, failed_count = ? WHERE id = ?`, [totalSent, parseInt(stats.failed || 0), campId]);
        }

        // 4. COMPLETION CHECK
        const remains = await redis.decr(`${envSuffix}:camp_progress:${campId}`);
        if (remains === 0) {
            // Final Sync
            const finalStats = await redis.hgetall(`${envSuffix}:stats:${campId}`);
            if (Object.keys(finalStats).length > 0) {
                const finalTotalSent = parseInt(finalStats.sent || 0) + parseInt(finalStats.failed || 0);
                await query(`UPDATE ${campaignTable} SET status = "sent", sent_count = ?, failed_count = ? WHERE id = ?`, 
                    [finalTotalSent, parseInt(finalStats.failed || 0), campId]);
                
                // Cleanup Redis
                await redis.del(`${envSuffix}:camp_progress:${campId}`);
                await redis.del(`${envSuffix}:stats:${campId}`);
                await redis.del(`${envSuffix}:tracked:${campId}`);
                await redis.del(`${envSuffix}:tracked_fail:${campId}`);
                // console.log(`[Engine] Campaign ${campId} COMPLETED and Synced.`);
            } else {
                await query(`UPDATE ${campaignTable} SET status = "sent" WHERE id = ?`, [campId]);
                await redis.del(`${envSuffix}:camp_progress:${campId}`);
            }
        } else if (remains < 0) {
             await redis.del(`${envSuffix}:camp_progress:${campId}`); // Safeguard
        }

    } catch (err) {
        console.error(`[Worker Error] Job ${job.id}:`, err.message);
        throw err; // Allow BullMQ retry
    }
}, {
    connection: redisConnection,
    concurrency: 500, // SUPER-FAST: Process 500 parallel messages
    limiter: {
        max: 1000,    // 1000 messages per second
        duration: 1000,
    },
    removeOnComplete: {
        age: 60,      // Keep last 60 seconds of history only
        count: 100, 
    },
    removeOnFail: {
        age: 24 * 3600 // Keep failures for 24h
    }
});

campaignWorker.on('error', (err) => {
    if (process.env.NODE_ENV !== 'production' || (process.cwd().includes('C:') || process.cwd().includes('Users'))) {
       // Silence local Redis errors so app doesn't crash on Windows
    } else {
        console.error('❌ Redis Worker Error:', err.message);
    }
});

module.exports = campaignWorker;
