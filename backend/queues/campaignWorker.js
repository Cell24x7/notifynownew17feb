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
            
            // Still decrement progress if it was accidentally incremented twice
            const remains = await redis.decr(`${envSuffix}:camp_progress:${item.campaign_id}`);
            if (remains <= 0) {
                const finalStats = await redis.hgetall(`${envSuffix}:stats:${item.campaign_id}`);
                await query(`UPDATE ${campaignTable} SET status = "sent", sent_count = ?, failed_count = ? WHERE id = ?`, 
                    [parseInt(finalStats.sent || 0), parseInt(finalStats.failed || 0), item.campaign_id]);
                await redis.del(`${envSuffix}:camp_progress:${item.campaign_id}`);
                await redis.del(`${envSuffix}:stats:${item.campaign_id}`);
            }
            return;
        }

        // 1. Process Message
        const { sendUniversalMessage } = require('../services/sendingService');
        result = await sendUniversalMessage(item);

        const now = new Date();
        const campId = item.campaign_id;
        
        // Safety: ensure logsTable is correct for API campaigns
        let effectiveLogsTable = logsTable;
        if (campId && campId.startsWith('CAMP_API_')) {
            effectiveLogsTable = 'api_message_logs';
        } else if (!effectiveLogsTable) {
            effectiveLogsTable = 'message_logs';
        }

        const msgContent = item.template_body || item.campaign_name || 'Template Message';

        // 2. DB Log & Queue Update
        if (result.success) {
            // Update status FIRST to mark it as done
            await query(`UPDATE ${queueTable} SET status = "sent", message_id = ?, updated_at = NOW() WHERE id = ?`, [result.messageId, item.id]);
            await redis.hincrby(`${envSuffix}:stats:${campId}`, 'sent', 1);
            
            // Detailed Logs for Reports (Try-catch to prevent job failure if logging fails)
            try {
                await query(
                    `INSERT INTO ${effectiveLogsTable} (user_id, campaign_id, campaign_name, recipient, status, message_id, channel, template_name, send_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
                    [item.user_id, campId, item.campaign_name || 'N/A', item.mobile, 'sent', result.messageId, item.channel, item.template_name || 'N/A', now]
                );
            } catch (e) { console.error('Error logging to message_logs:', e.message); }

            // Webhook Logs for Chat UI
            try {
                await query(
                    `INSERT INTO webhook_logs (user_id, recipient, message_id, status, event_type, type, channel, message_content, campaign_id, campaign_name, template_name, raw_payload, created_at) 
                     VALUES (?, ?, ?, 'sent', 'SENT', ?, ?, ?, ?, ?, ?, ?, NOW())`,
                    [
                        item.user_id, 
                        item.mobile, 
                        result.messageId, 
                        (item.channel || 'rcs').toLowerCase(), 
                        (item.channel || 'rcs').toLowerCase(),
                        msgContent,
                        campId,
                        item.campaign_name || 'Campaign',
                        item.template_name || 'N/A',
                        JSON.stringify({ note: 'Campaign Message', item_id: item.id })
                    ]
                );
            } catch (err) { console.error('Error logging to webhook_logs:', err.message); }

        } else {
            await query(`UPDATE ${queueTable} SET status = "failed", error_message = ? WHERE id = ?`, [result.error || 'Failed', item.id]);
            await redis.hincrby(`${envSuffix}:stats:${campId}`, 'failed', 1);
            
            try {
                await query(
                    `INSERT INTO ${effectiveLogsTable} (user_id, campaign_id, campaign_name, recipient, status, channel, template_name, send_time, failure_reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
                    [item.user_id, campId, item.campaign_name || 'N/A', item.mobile, 'failed', item.channel, item.template_name || 'N/A', now, result.error || 'Failed']
                );
            } catch (e) { console.error('Error logging failure to message_logs:', e.message); }
        }

        // 3. PERIODIC DB SYNC (Avoid Row Contention)
        const processedTotal = await redis.hincrby(`${envSuffix}:stats:${campId}`, 'total_processed', 1);
        
        // INSTANT UPDATES for small campaigns (< 10 msgs: sync every msg, < 100: sync every 2)
        const syncInterval = (processedTotal < 10) ? 1 : 100;
        if (processedTotal % syncInterval === 0) {
            const stats = await redis.hgetall(`${envSuffix}:stats:${campId}`);
            await query(`UPDATE ${campaignTable} SET sent_count = ?, failed_count = ? WHERE id = ?`, [parseInt(stats.sent || 0), parseInt(stats.failed || 0), campId]);
        }

        // 4. COMPLETION CHECK
        const remains = await redis.decr(`${envSuffix}:camp_progress:${campId}`);
        if (remains <= 0) {
            // Final Sync
            const finalStats = await redis.hgetall(`${envSuffix}:stats:${campId}`);
            await query(`UPDATE ${campaignTable} SET status = "sent", sent_count = ?, failed_count = ? WHERE id = ?`, 
                [parseInt(finalStats.sent || 0), parseInt(finalStats.failed || 0), campId]);
            
            // Cleanup Redis
            await redis.del(`${envSuffix}:camp_progress:${campId}`);
            await redis.del(`${envSuffix}:stats:${campId}`);
            console.log(`[Engine] Campaign ${campId} COMPLETED and Synced.`);
        }

    } catch (err) {
        console.error(`[Worker Error] Job ${job.id}:`, err.message);
        throw err; // Allow BullMQ retry
    }
}, {
    connection: redisConnection,
    concurrency: 5, // LOW CONCURRENCY for 100% reliability on tests (Prevents 'Too many requests' 429)
    limiter: {
        max: 5, 
        duration: 1000,
    }
});

module.exports = campaignWorker;

