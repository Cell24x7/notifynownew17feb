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

const envSuffix = process.env.APP_NAME || 'notifynow-production';
const queueName = `campaign-sending-${envSuffix}`;

const campaignWorker = new Worker(queueName, async (job) => {
    const { item, tableConfig } = job.data;
    const { queueTable, campaignTable, logsTable } = tableConfig;
    let result = { success: false, error: 'Unknown' };

    try {
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
            await query(`UPDATE ${queueTable} SET status = "sent", message_id = ?, updated_at = NOW() WHERE id = ?`, [result.messageId, item.id]);
            await redis.hincrby(`stats:${campId}`, 'sent', 1);
            
            // Detailed Logs for Reports
            await query(
                `INSERT INTO ${effectiveLogsTable} (user_id, campaign_id, campaign_name, recipient, status, message_id, channel, template_name, send_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
                [item.user_id, campId, item.campaign_name || 'N/A', item.mobile, 'sent', result.messageId, item.channel, item.template_name || 'N/A', now]
            );

            // Webhook Logs for Chat UI History (Crucial for Dashboard visibility)
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
            ).catch(err => console.error('Error logging to webhook_logs:', err.message));

        } else {
            await query(`UPDATE ${queueTable} SET status = "failed", updated_at = NOW() WHERE id = ?`, [item.id]);
            await redis.hincrby(`stats:${campId}`, 'failed', 1);
            
            await query(
                `INSERT INTO ${effectiveLogsTable} (user_id, campaign_id, campaign_name, recipient, status, channel, template_name, send_time, failure_reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
                [item.user_id, campId, item.campaign_name || 'N/A', item.mobile, 'failed', item.channel, item.template_name || 'N/A', now, result.error || 'Failed']
            );
        }

        // 3. PERIODIC DB SYNC (Avoid Row Contention)
        // Every 50 messages, sync counts from Redis to DB to show progress gracefully
        const processedTotal = await redis.hincrby(`stats:${campId}`, 'total_processed', 1);
        if (processedTotal % 50 === 0) {
            const stats = await redis.hgetall(`stats:${campId}`);
            await query(`UPDATE ${campaignTable} SET sent_count = ?, failed_count = ? WHERE id = ?`, [parseInt(stats.sent || 0), parseInt(stats.failed || 0), campId]);
        }

        // 4. COMPLETION CHECK
        const remains = await redis.decr(`camp_progress:${campId}`);
        if (remains <= 0) {
            // Final Sync
            const finalStats = await redis.hgetall(`stats:${campId}`);
            await query(`UPDATE ${campaignTable} SET status = "sent", sent_count = ?, failed_count = ? WHERE id = ?`, 
                [parseInt(finalStats.sent || 0), parseInt(finalStats.failed || 0), campId]);
            
            // Cleanup Redis
            await redis.del(`camp_progress:${campId}`);
            await redis.del(`stats:${campId}`);
            console.log(`[Engine] Campaign ${campId} COMPLETED and Synced.`);
        }

    } catch (err) {
        console.error(`[Worker Error] Job ${job.id}:`, err.message);
        throw err;
    }
}, {
    connection: redisConnection,
    concurrency: 500, // Process 500 messages in parallel
    limiter: {
        max: 2000,
        duration: 1000,
    }
});

module.exports = campaignWorker;

