const { Worker } = require('bullmq');
const { redisConnection } = require('./campaignQueue');
const { query } = require('../config/db');
const Redis = require('ioredis');

// CREATE REUSABLE REDIS FOR COUNTERS
const redis = new Redis(redisConnection);

/**
 * BullMQ Worker for High-Volume Messaging (1 Crore Scaling)
 * Optimized for high-throughput with minimized DB overhead.
 */

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
            console.log(`[Worker] Skipping job ${job.id} for ${item.mobile} - Already processed (Status: ${check[0].status})`);
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
                    `INSERT INTO ${effectiveLogsTable} (user_id, campaign_id, campaign_name, recipient, status, message_id, channel, template_name, send_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
                    [item.user_id || job.data.item.user_id, campId, cName, item.mobile, 'sent', result.messageId, chan, tName, now]
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
                    `INSERT INTO ${effectiveLogsTable} (user_id, campaign_id, campaign_name, recipient, status, channel, template_name, send_time, failure_reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
                    [item.user_id || job.data.item.user_id, campId, cName, item.mobile, 'failed', chan, tName, now, String(result.error || 'Provider rejected').slice(0, 1000)]
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

        // 3. PERIODIC DB SYNC (Avoid Row Contention)
        const processedTotal = await redis.hincrby(`${envSuffix}:stats:${campId}`, 'total_processed', 1);
        
        // INSTANT UPDATES for small campaigns (< 10 msgs: sync every msg, else sync every 100)
        const syncInterval = (processedTotal < 10) ? 1 : 100;
        if (processedTotal % syncInterval === 0) {
            const stats = await redis.hgetall(`${envSuffix}:stats:${campId}`);
            await query(`UPDATE ${campaignTable} SET sent_count = ?, failed_count = ? WHERE id = ?`, [parseInt(stats.sent || 0), parseInt(stats.failed || 0), campId]);
        }

        // 4. COMPLETION CHECK
        const remains = await redis.decr(`${envSuffix}:camp_progress:${campId}`);
        if (remains === 0) {
            // Final Sync
            const finalStats = await redis.hgetall(`${envSuffix}:stats:${campId}`);
            if (Object.keys(finalStats).length > 0) {
                await query(`UPDATE ${campaignTable} SET status = "sent", sent_count = ?, failed_count = ? WHERE id = ?`, 
                    [parseInt(finalStats.sent || 0), parseInt(finalStats.failed || 0), campId]);
                
                // Cleanup Redis
                await redis.del(`${envSuffix}:camp_progress:${campId}`);
                await redis.del(`${envSuffix}:stats:${campId}`);
                await redis.del(`${envSuffix}:tracked:${campId}`);
                await redis.del(`${envSuffix}:tracked_fail:${campId}`);
                console.log(`[Engine] Campaign ${campId} COMPLETED and Synced.`);
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
    concurrency: 100, // FAST: Handle 1 Lakh+ campaigns with high throughput
    limiter: {
        max: 200, 
        duration: 1000,
    }
});

module.exports = campaignWorker;
