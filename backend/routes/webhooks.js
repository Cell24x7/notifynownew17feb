const express = require('express');
const router = express.Router();
const { query } = require('../config/db');

// POST /api/webhooks/rcs/callback
// Standard endpoint for RCS Delivery Reports & Incoming Messages
router.post('/rcs/callback', async (req, res) => {
    try {
        const payload = req.body;

        console.log('==============================================');
        console.log('📨 RECEIVED RCS WEBHOOK');
        console.log('Timestamp:', new Date().toISOString());
        console.log('Payload:', JSON.stringify(payload, null, 2));
        console.log('==============================================');

        // -------------------------------------------------------------
        // LOGIC TO HANDLE DIFFERENT EVENTS
        // -------------------------------------------------------------

        // 1. DELIVERY REPORTS (DLR)
        // Common fields: messageId, status (delivered, read, failed), error
        if (payload.status) {
            const { messageId, status, error } = payload;
            let finalStatus = status.toLowerCase();

            console.log(`📊 DLR Update: Message ${messageId} is ${finalStatus}`);

            // Update message_logs
            try {
                // Check if message exists
                const [logs] = await query('SELECT * FROM message_logs WHERE message_id = ?', [messageId]);

                if (logs.length > 0) {
                    const log = logs[0];

                    // Only update if status is "better" or different
                    // Hierarchy: sent -> submitted -> delivered -> read
                    // Failure is separate

                    await query('UPDATE message_logs SET status = ?, updated_at = NOW() WHERE message_id = ?', [finalStatus, messageId]);

                    // Update specific timestamps based on status
                    if (finalStatus === 'delivered') {
                        await query('UPDATE message_logs SET delivery_time = NOW() WHERE message_id = ?', [messageId]);
                    } else if (finalStatus === 'read') {
                        // If it's read, it must have been delivered. Set delivery_time if null.
                        await query('UPDATE message_logs SET read_time = NOW(), delivery_time = COALESCE(delivery_time, NOW()) WHERE message_id = ?', [messageId]);
                    } else if (finalStatus === 'failed') {
                        await query('UPDATE message_logs SET failure_reason = ? WHERE message_id = ?', [error || 'Unknown error', messageId]);
                    }

                    // Update campaign counts
                    if (finalStatus === 'delivered' && log.status !== 'delivered' && log.status !== 'read') {
                        await query('UPDATE campaigns SET delivered_count = delivered_count + 1 WHERE id = ?', [log.campaign_id]);
                    } else if (finalStatus === 'read' && log.status !== 'read') {
                        // If it jumps straight to read, we should also count as delivered if not already? 
                        // Usually read implies delivered.
                        if (log.status !== 'delivered') {
                            await query('UPDATE campaigns SET delivered_count = delivered_count + 1, read_count = read_count + 1 WHERE id = ?', [log.campaign_id]);
                        } else {
                            await query('UPDATE campaigns SET read_count = read_count + 1 WHERE id = ?', [log.campaign_id]);
                        }
                    } else if (finalStatus === 'failed') {
                        await query('UPDATE campaigns SET failed_count = failed_count + 1 WHERE id = ?', [log.campaign_id]);
                    }

                    console.log(`✅ Updated status for ${messageId} to ${finalStatus}`);
                } else {
                    console.warn(`⚠️ Message ID ${messageId} not found in logs. DLR ignored.`);
                }
            } catch (dbErr) {
                console.error('❌ Database Error updating DLR:', dbErr.message);
            }
        }

        // 2. INCOMING MESSAGES (Replies)
        // Common fields: sender, message / text, type
        if (payload.sender && (payload.message || payload.text)) {
            const sender = payload.sender; // Mobile number
            const text = payload.message || payload.text;
            const msgId = payload.messageId || `IN_${Date.now()}`;

            console.log(`💬 Incoming Reply from ${sender}: ${text}`);

            try {
                // Save to webhook_logs
                await query(
                    'INSERT INTO webhook_logs (sender, recipient, message_content, raw_payload) VALUES (?, ?, ?, ?)',
                    [sender, payload.recipient || 'System', text, JSON.stringify(payload)]
                );
                console.log(`✅ Saved incoming message from ${sender} to DB.`);
            } catch (dbErr) {
                console.error('❌ Failed to save incoming message:', dbErr.message);
            }
        }

        // Always return 200 OK to acknowledge receipt
        res.status(200).json({ success: true, message: 'Webhook received' });

    } catch (error) {
        console.error('❌ Webhook Error:', error.message);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

// GET /api/webhooks/test
// Simple test route to verify connectivity
router.get('/test', (req, res) => {
    res.json({
        success: true,
        message: 'Webhook Endpoint is Active! use POST /api/webhooks/rcs/callback for data.'
    });
});

module.exports = router;
