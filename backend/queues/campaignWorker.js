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
        // 1. Process Message (WhatsApp/RCS/SMS logic)
        // Here we integrate the provider calls (Dotgo/Bot/API)
        // For demonstration, we use a generic sender from statsService or similar if available
        // But for high speed, we call the provider API directly.

        // Example: Dotgo RCS Send
        if (item.channel === 'rcs') {
            const { sendRcsMessage } = require('../services/rcsService');
            result = await sendRcsMessage(item);
        } else if (item.channel === 'whatsapp') {
            const { sendWhatsappMessage } = require('../services/whatsappService');
            result = await sendWhatsappMessage(item);
        }

        // 2. Update Status and Populate Detailed Logs
        if (result.success) {
            // Success: Update counters and Detailed Log
            await query(`UPDATE ${queueTable} SET status = "sent", message_id = ?, created_at = NOW() WHERE id = ?`, [result.messageId, item.id]);
            await query(`UPDATE ${campaignTable} SET sent_count = COALESCE(sent_count, 0) + 1 WHERE id = ?`, [item.campaign_id]);
            
            // Insert into detailed logsTable
            await query(`INSERT INTO ${logsTable} (user_id, campaign_id, mobile, status, message_id, channel, template_name, content, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`, 
            [item.user_id, item.campaign_id, item.mobile, 'sent', result.messageId, item.channel, item.template_name || 'N/A', item.content || 'N/A']);
        } else {
            // Failed: Update counters and Detailed Log
            await query(`UPDATE ${queueTable} SET status = "failed", error_message = ? WHERE id = ?`, [result.error || 'Provider rejected', item.id]);
            await query(`UPDATE ${campaignTable} SET failed_count = COALESCE(failed_count, 0) + 1 WHERE id = ?`, [item.campaign_id]);
            
            // Log the failure in detailed report
            await query(`INSERT INTO ${logsTable} (user_id, campaign_id, mobile, status, error_message, channel, template_name, content, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`, 
            [item.user_id, item.campaign_id, item.mobile, 'failed', result.error || 'Failed', item.channel, item.template_name || 'N/A', item.content || 'N/A']);
        }

    } catch (err) {
        console.error(`[Worker Error] Job ${job.id}:`, err.message);
        throw err; // Trigger retry
    }
}, {
    connection: redisConnection,
    concurrency: 50, // Process 50 messages in parallel per worker instance
    limiter: {
        max: 500,
        duration: 1000, // Max 500 requests per second to stay within API limits
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
