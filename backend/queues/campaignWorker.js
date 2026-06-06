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

// AUTO-RECOVERY: Clean up stuck jobs and orphaned data on startup
// CRITICAL: Only run on PM2 instance 0 to prevent MySQL lock contention across cluster instances
async function rescueStuckJobsOnStartup() {
    try {
        // 0. Drain waiting jobs from BullMQ to prevent duplicate bloat after restarts
        try {
            const { campaignQueue } = require('./campaignQueue');
            await campaignQueue.drain(true);
            console.log('[Rescue] Drained waiting jobs from BullMQ queue to prevent duplicates.');
        } catch (drainErr) {
            console.error('[Rescue] Draining queue failed:', drainErr.message);
        }

        // 1. Reset stuck processing jobs
        await query('UPDATE campaign_queue SET status = "pending" WHERE status = "processing" AND updated_at < DATE_SUB(NOW(), INTERVAL 5 MINUTE)');
        
        // 2. DELETE orphaned items (Campaign no longer exists) - CRITICAL for stability
        await query('DELETE q FROM campaign_queue q LEFT JOIN campaigns c ON q.campaign_id = c.id WHERE c.id IS NULL');
        
        // 3. Mark items as 'failed' if their campaign is already finished - Prevents ghost sending
        await query(`
            UPDATE campaign_queue q 
            JOIN campaigns c ON q.campaign_id = c.id 
            SET q.status = "failed" 
            WHERE q.status = "pending" AND c.status IN ("sent", "completed", "failed")
        `);

        // 4. Also do the same for API queue
        await query('DELETE q FROM api_campaign_queue q LEFT JOIN api_campaigns c ON q.campaign_id = c.id WHERE c.id IS NULL');
        await query(`
            UPDATE api_campaign_queue q 
            JOIN api_campaigns c ON q.campaign_id = c.id 
            SET q.status = "failed" 
            WHERE q.status = "pending" AND c.status IN ("sent", "completed", "failed")
        `);

        console.log('[Rescue] System background cleanup finished.');
    } catch (e) {
        console.error('[Rescue] Startup recovery failed:', e.message);
    }
}

// Only run startup rescue on instance 0 to prevent MySQL lock contention
const isFirstInstance = process.env.NODE_APP_INSTANCE === undefined || process.env.NODE_APP_INSTANCE === '0';
if (isFirstInstance) {
    rescueStuckJobsOnStartup();
} else {
    // Non-primary instances: just drain BullMQ queue (no MySQL writes)
    setTimeout(async () => {
        try {
            const { campaignQueue } = require('./campaignQueue');
            await campaignQueue.drain(true);
        } catch (e) { /* ignore */ }
    }, 3000); // 3s delay so instance 0 drains first
}

// Helper to safely decrement progress and mark campaign completed if remains === 0
async function decrementAndCheckCompletion(campId, envSuffix, campaignTable) {
    try {
        const remains = await redis.decr(`${envSuffix}:camp_progress:${campId}`);
        if (remains === 0) {
            const logsTable = campaignTable === 'campaigns' ? 'message_logs' : 'api_message_logs';
            
            // Query message_logs to get the true total sent and failed counts!
            const [dbStats] = await query(`
                SELECT 
                    COUNT(*) as total,
                    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
                FROM ${logsTable}
                WHERE campaign_id = ?
            `, [campId]);

            const finalTotalSent = dbStats[0]?.total || 0;
            const finalTotalFailed = dbStats[0]?.failed || 0;

            await query(
                `UPDATE ${campaignTable} SET status = "sent", sent_count = ?, failed_count = ? WHERE id = ?`, 
                [finalTotalSent, finalTotalFailed, campId]
            );
            
            // Cleanup Redis
            await redis.del(`${envSuffix}:camp_progress:${campId}`);
            await redis.del(`${envSuffix}:stats:${campId}`);
            await redis.del(`${envSuffix}:tracked:${campId}`);
            await redis.del(`${envSuffix}:tracked_fail:${campId}`);
        } else if (remains < 0) {
            await redis.del(`${envSuffix}:camp_progress:${campId}`); // Safeguard
        }
    } catch (err) {
        console.error(`[Completion Helper Error] Campaign ${campId}:`, err.message);
    }
}

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
            await decrementAndCheckCompletion(item.campaign_id, envSuffix, campaignTable);
            return;
        }

        // REDIS STRICT IDEMPOTENCY LOCK: Prevent double-sends if DB update fails and BullMQ retries
        const lockKey = `${envSuffix}:strict_lock:${queueTable}:${item.id}`;
        const acquired = await redis.setnx(lockKey, "1");
        if (acquired === 0) {
            console.warn(`[Worker] Skipping duplicate send attempt for ${item.mobile} (Job ${job.id}) due to active Redis lock.`);
            await decrementAndCheckCompletion(item.campaign_id, envSuffix, campaignTable);
            return; // Assume previous attempt succeeded or is still in flight
        }
        await redis.expire(lockKey, 90); // Lock for 90s only — allows retry after PM2 crash

        // Pre-calculate status independent variables
        const now = new Date();
        const campId = item.campaign_id;
        const chan = (item.channel || 'rcs').toLowerCase();
        const tName = item.template_name || 'N/A';
        const cName = item.campaign_name || 'N/A';
        const msgContent = item.template_body || item.campaign_name || 'Template Message';

        // 1. Process Message
        // Ensure variables are parsed if they come from SQL as JSON string
        if (typeof item.contact_variables === 'string') {
            try {
                item.contact_variables = JSON.parse(item.contact_variables);
            } catch (e) {
                item.contact_variables = {};
            }
        }
        
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
        const metadata = JSON.stringify({ variables: item.contact_variables || {} });

        if (result.success) {
            try {
                // Check if this messageId was ALREADY received in webhook_logs (DLR Race Condition Fix!)
                const [preReceived] = await query(
                    'SELECT status, event_type, raw_payload FROM webhook_logs WHERE message_id = ? LIMIT 1',
                    [result.messageId]
                );

                let finalStatus = 'sent';
                if (preReceived.length > 0) {
                    finalStatus = preReceived[0].status;
                    console.log(`✨ DLR Race Condition Recovery: Found pre-received status [${finalStatus}] in webhook_logs for MsgID: ${result.messageId}`);
                }

                // Mandatory log to message_logs
                await query(
                    `INSERT INTO ${effectiveLogsTable} (user_id, campaign_id, campaign_name, recipient, status, message_id, channel, template_name, message_content, send_time, is_failover_enabled, failover_sms_template, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
                    [item.user_id || job.data.item.user_id, campId, cName, item.mobile, finalStatus, result.messageId, chan, tName, result.processedMessage || msgContent, now, item.is_failover_enabled || 0, item.failover_sms_template || null, metadata]
                );

                // Secondary log to webhook_logs for Chat UI (Only insert if not already present)
                if (preReceived.length === 0) {
                    await query(
                        `INSERT INTO webhook_logs (user_id, recipient, message_id, status, event_type, type, channel, message_content, campaign_id, campaign_name, template_name, raw_payload, created_at) 
                         VALUES (?, ?, ?, 'sent', 'SENT', ?, ?, ?, ?, ?, ?, ?, NOW())`,
                        [item.user_id || job.data.item.user_id, item.mobile, result.messageId, chan, chan, msgContent, campId, cName, tName, JSON.stringify({ note: 'Campaign Message', item_id: item.id })]
                    ).catch(() => {});
                } else {
                    // Update the webhook_log to link the campaign metadata
                    await query(
                        `UPDATE webhook_logs SET campaign_id = COALESCE(campaign_id, ?), campaign_name = COALESCE(campaign_name, ?), template_name = COALESCE(template_name, ?) WHERE message_id = ?`,
                        [campId, cName, tName, result.messageId]
                    ).catch(() => {});
                }

                // If it was pre-received with a status other than 'sent', update campaign counts and trigger failovers
                if (preReceived.length > 0 && finalStatus !== 'sent' && campId) {
                    const campaignsTable = String(campId).startsWith('CAMP_API_') ? 'api_campaigns' : 'campaigns';
                    
                    if (finalStatus === 'delivered') {
                        await query(`UPDATE ${effectiveLogsTable} SET delivery_time = NOW() WHERE message_id = ?`, [result.messageId]);
                        const key = `${campaignsTable}:${campId}:delivered_count`;
                        global.campaignCountBuffer[key] = (global.campaignCountBuffer[key] || 0) + 1;
                        console.log(`📈 Campaign ${campId} (DLR Recovery): Buffered Delivered count increment`);
                    } else if (finalStatus === 'read') {
                        await query(`UPDATE ${effectiveLogsTable} SET read_time = NOW(), delivery_time = COALESCE(delivery_time, NOW()) WHERE message_id = ?`, [result.messageId]);
                        const delKey = `${campaignsTable}:${campId}:delivered_count`;
                        const readKey = `${campaignsTable}:${campId}:read_count`;
                        global.campaignCountBuffer[delKey] = (global.campaignCountBuffer[delKey] || 0) + 1;
                        global.campaignCountBuffer[readKey] = (global.campaignCountBuffer[readKey] || 0) + 1;
                        console.log(`📈 Campaign ${campId} (DLR Recovery): Buffered Delivered & Read count increment`);
                    } else if (finalStatus === 'failed') {
                        let reason = 'Provider rejected (DLR)';
                        try {
                            const payload = JSON.parse(preReceived[0].raw_payload || '{}');
                            let decodedData = {};
                            if (payload.message?.data) {
                                const base64Data = payload.message.data;
                                const decodedString = Buffer.from(base64Data, 'base64').toString('utf-8');
                                decodedData = JSON.parse(decodedString);
                            }
                            reason = decodedData.reason || decodedData.description || decodedData.error || 'Provider rejected (DLR)';
                        } catch(e) {}
                        
                        await query(`UPDATE ${effectiveLogsTable} SET failure_reason = ? WHERE message_id = ?`, [reason, result.messageId]);
                        
                        const key = `${campaignsTable}:${campId}:failed_count`;
                        global.campaignCountBuffer[key] = (global.campaignCountBuffer[key] || 0) + 1;
                        console.log(`📉 Campaign ${campId} (DLR Recovery): Buffered Failed count increment`);
                        
                        // Trigger failover automation!
                        if (item.is_failover_enabled && item.failover_sms_template) {
                            console.log(`[Worker DLR Recovery] ⚡ Failover Triggered for ${item.mobile} (Channel: ${chan})`);
                            try {
                                const { processAutomation } = require('../services/automationService');
                                const automationPayload = {
                                    ...item,
                                    recipient: item.mobile,
                                    original_channel: chan,
                                    failover_template_id: item.failover_sms_template,
                                    is_api: String(campId).startsWith('CAMP_API_'),
                                    metadata: { variables: item.contact_variables || {} }
                                };
                                processAutomation(item.user_id || 1, 'message_failed', automationPayload, null).catch(e => console.error('[Worker DLR Recovery] Failover error:', e.message));
                            } catch (failoverErr) {
                                console.error('[Worker DLR Recovery] Failed to trigger automation failover:', failoverErr.message);
                            }
                        }
                    }
                }
            } catch (logErr) {
                console.error(`[Worker] DB INSERT FAIL for ${item.mobile}: ${logErr.message}`);
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
                    `INSERT INTO ${effectiveLogsTable} (user_id, campaign_id, campaign_name, recipient, status, channel, template_name, send_time, failure_reason, is_failover_enabled, failover_sms_template, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
                    [item.user_id || job.data.item.user_id, campId, cName, item.mobile, 'failed', chan, tName, now, String(result.error || 'Provider rejected').slice(0, 1000), item.is_failover_enabled || 0, item.failover_sms_template || null, metadata]
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
            const [dbStats] = await query(`
                SELECT 
                    COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent,
                    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
                FROM ${queueTable}
                WHERE campaign_id = ?
            `, [campId]);
            
            const totalSent = dbStats[0]?.sent || 0;
            const totalFailed = dbStats[0]?.failed || 0;
            const totalProcessed = totalSent + totalFailed;
            
            // Only update sent_count! Do NOT update failed_count to avoid wiping out webhook callbacks!
            await query(`UPDATE ${campaignTable} SET sent_count = ? WHERE id = ?`, [totalProcessed, campId]);
        }

        // 4. COMPLETION CHECK
        await decrementAndCheckCompletion(campId, envSuffix, campaignTable);

    } catch (err) {
        console.error(`[Worker Error] Job ${job.id}:`, err.message);
        throw err; // Allow BullMQ retry
    }
}, {
    connection: redisConnection,
    concurrency: 120, // Safe max — 200 caused OOM, 120 = fast + stable
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
