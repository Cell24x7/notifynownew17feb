const { Worker } = require('bullmq');
const { redisConnection } = require('./campaignQueue');
const { query } = require('../config/db');
const axios = require('axios');

/**
 * BullMQ Worker for High-Volume Messaging (1 Crore Scaling)
 * Handles parallel processing with rate limiting.
 */

// CREATE THE WORKER WITH ENVIRONMENT ISOLATION
const envSuffix = process.env.APP_NAME || 'notifynow-production';
const queueName = `campaign-sending-${envSuffix}`;

const campaignWorker = new Worker(queueName, async (job) => {
    const { item, tableConfig } = job.data;
    const { queueTable, campaignTable, logsTable } = tableConfig;
    let result = { success: false, error: 'Unknown' };

    try {
        // 1. Process Message (High-Volume Universal Sending Service)
        const { sendUniversalMessage } = require('../services/sendingService');
        result = await sendUniversalMessage(item);

        // 2. Update Status and Detailed Logs (Optimized Column mapping)
        const now = new Date();
        if (result.success) {
            // SUCCESS - One combined update if possible? No, we need stats and logs.
            await query(`UPDATE ${queueTable} SET status = "sent", message_id = ?, updated_at = NOW() WHERE id = ?`, [result.messageId, item.id]);
            await query(`UPDATE ${campaignTable} SET sent_count = COALESCE(sent_count, 0) + 1 WHERE id = ?`, [item.campaign_id]);
            
            await query(
                `INSERT INTO ${logsTable} (user_id, campaign_id, campaign_name, recipient, status, message_id, channel, template_name, send_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
                [item.user_id, item.campaign_id, item.campaign_name || 'Manual', item.mobile, 'sent', result.messageId, item.channel, item.template_name || 'N/A', now]
            );
        } else {
            // FAILURE
            await query(`UPDATE ${queueTable} SET status = "failed", updated_at = NOW() WHERE id = ?`, [item.id]);
            await query(`UPDATE ${campaignTable} SET failed_count = COALESCE(failed_count, 0) + 1 WHERE id = ?`, [item.campaign_id]);
            
            const [inserted] = await query(
                `INSERT INTO ${logsTable} (user_id, campaign_id, campaign_name, recipient, status, channel, template_name, send_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
                [item.user_id, item.campaign_id, item.campaign_name || 'Manual', item.mobile, 'failed', item.channel, item.template_name || 'N/A', now]
            );

            if (inserted && inserted.insertId) {
                await query(`UPDATE ${logsTable} SET failure_reason = ? WHERE id = ?`, [result.error || 'Failed', inserted.insertId]);
            }
        }

        // 3. FINAL COMPLETION CHECK (Rocket Speed Redis DECR Strategy)
        // Eliminates 1,00,000 extra SQL SELECTs per batch
        const Redis = require('ioredis');
        const redisClient = new Redis(redisConnection);
        const remains = await redisClient.decr(`camp_progress:${item.campaign_id}`);
        
        if (remains <= 0) {
            await query(`UPDATE ${campaignTable} SET status = "sent" WHERE id = ?`, [item.campaign_id]);
            await redisClient.del(`camp_progress:${item.campaign_id}`);
            console.log(`[Engine] Campaign ${item.campaign_id} fully COMPLETED (Redis Counter Synced).`);
        }
        await redisClient.quit();

    } catch (err) {
        console.error(`[Worker Error] Job ${job.id}:`, err.message);
        throw err; // Trigger retry
    }
}, {
    connection: redisConnection,
    concurrency: 500, // Process 500 messages in parallel for maximum throughput
    limiter: {
        max: 2000,
        duration: 1000, // Max 2000 requests per second
    }
});

// Event Listeners
campaignWorker.on('completed', job => {
    console.debug(`[Job Completed] ${job.id}`);
});

campaignWorker.on('failed', (job, err) => {
    console.error(`[Job Failed] ${job.id}:`, err.message);
});

module.exports = campaignWorker;
