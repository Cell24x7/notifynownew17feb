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

// GET /api/webhooks/dotgo
// Quick check to see if logs are storing correctly
router.get('/dotgo', async (req, res) => {
    console.log('🔍 GET /api/webhooks/dotgo hit');
    try {
        const [logs] = await query('SELECT * FROM webhook_logs ORDER BY created_at DESC LIMIT 20');
        res.json({
            success: true,
            message: 'Latest 20 Dotgo Webhook Logs',
            data: logs
        });
    } catch (error) {
        console.error('❌ Error fetching dotgo logs:', error.message);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

// POST /api/webhooks/dotgo
// Dotgo specific webhook handler (decodes base64 data)
router.post('/dotgo', async (req, res) => {
    try {
        const payload = req.body;
        console.log('📦 Dotgo Webhook Raw:', JSON.stringify(payload, null, 2));

        if (!payload.message || !payload.message.data) {
            return res.status(400).json({ success: false, message: 'Invalid Dotgo payload' });
        }

        // 1. Decode Base64 data
        let decodedData = {};
        try {
            const base64Data = payload.message.data;
            const decodedString = Buffer.from(base64Data, 'base64').toString('utf-8');
            decodedData = JSON.parse(decodedString);
            console.log('🔓 Decoded Dotgo Data:', JSON.stringify(decodedData, null, 2));
        } catch (e) {
            console.warn('⚠️ Failed to decode Dotgo message.data:', e.message);
        }

        const messageId = decodedData.messageId || decodedData.messageID || payload.message?.messageId;
        const eventType = decodedData.eventType || payload.message?.attributes?.event_type;
        const recipient = decodedData.senderPhoneNumber || decodedData.userPhoneNumber || decodedData.destinationPhoneNumber;
        let finalStatus = eventType ? eventType.toLowerCase() : 'unknown';

        console.log(`📊 Dotgo Status: ${finalStatus} (MsgID: ${messageId}) for ${recipient}`);

        // 2. Save/Update webhook_logs (Smart UPSERT logic)
        try {
            const [existing] = await query('SELECT id FROM webhook_logs WHERE message_id = ? LIMIT 1', [messageId]);

            if (existing.length > 0) {
                // UPDATE existing row
                await query(
                    `UPDATE webhook_logs SET 
                    status = ?, 
                    event_type = ?, 
                    raw_payload = ?,
                    received_time = COALESCE(?, received_time),
                    publish_time = COALESCE(?, publish_time),
                    updated_at = NOW()
                    WHERE id = ?`,
                    [
                        finalStatus,
                        eventType || null,
                        JSON.stringify(payload),
                        payload.receivedTime || null,
                        payload.message?.publishTime || null,
                        existing[0].id
                    ]
                );
                console.log(`✅ Updated existing webhook_log (ID: ${existing[0].id}) for ${messageId}`);
            } else {
                // INSERT new row as fallback
                await query(
                    `INSERT INTO webhook_logs 
                    (received_time, recipient, message_id, subscription, message_data, product, business_id, type, project_number, event_type, message_id_envelope, publish_time, raw_payload, status) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        payload.receivedTime || null,
                        recipient || null,
                        messageId || null,
                        payload.subscription || null,
                        payload.message?.data || null,
                        payload.message?.attributes?.product || null,
                        payload.message?.attributes?.business_id || null,
                        payload.message?.attributes?.type || null,
                        payload.message?.attributes?.project_number || null,
                        payload.message?.attributes?.event_type || null,
                        payload.message?.messageId || null,
                        payload.message?.publishTime || null,
                        JSON.stringify(payload),
                        finalStatus
                    ]
                );
                console.log(`✅ Created new webhook_log for ${messageId}`);
            }
        } catch (logErr) {
            console.error('❌ Error handling webhook_logs:', logErr.message);
        }

        // 3. Update message_logs & Campaign counts
        if (messageId) {
            try {
                const [logs] = await query('SELECT * FROM message_logs WHERE message_id = ?', [messageId]);

                if (logs.length > 0) {
                    const log = logs[0];
                    const oldStatus = log.status?.toLowerCase();

                    // Only update if status changed
                    if (oldStatus !== finalStatus) {
                        await query('UPDATE message_logs SET status = ?, updated_at = NOW() WHERE message_id = ?', [finalStatus, messageId]);

                        // Handle Timestamps
                        if (finalStatus === 'delivered') {
                            await query('UPDATE message_logs SET delivery_time = NOW() WHERE message_id = ?', [messageId]);
                        } else if (finalStatus === 'read') {
                            await query('UPDATE message_logs SET read_time = NOW(), delivery_time = COALESCE(delivery_time, NOW()) WHERE message_id = ?', [messageId]);
                        } else if (finalStatus === 'failed') {
                            const reason = decodedData.description || decodedData.reason || decodedData.error || decodedData.failureCode || decodedData.errorMessage || 'Provider rejected (check logs)';
                            await query('UPDATE message_logs SET failure_reason = ? WHERE message_id = ?', [reason, messageId]);
                        }

                        // Handle Campaign Counters (Real-time updates)
                        if (log.campaign_id) {
                            if (finalStatus === 'delivered' && oldStatus !== 'delivered' && oldStatus !== 'read') {
                                await query('UPDATE campaigns SET delivered_count = delivered_count + 1 WHERE id = ?', [log.campaign_id]);
                            } else if (finalStatus === 'read' && oldStatus !== 'read') {
                                if (oldStatus !== 'delivered') {
                                    await query('UPDATE campaigns SET delivered_count = delivered_count + 1, read_count = read_count + 1 WHERE id = ?', [log.campaign_id]);
                                } else {
                                    await query('UPDATE campaigns SET read_count = read_count + 1 WHERE id = ?', [log.campaign_id]);
                                }
                            } else if (finalStatus === 'failed' && oldStatus !== 'failed') {
                                await query('UPDATE campaigns SET failed_count = failed_count + 1 WHERE id = ?', [log.campaign_id]);
                            }
                        }

                        console.log(`✅ Message stats updated for ${messageId} (${oldStatus} -> ${finalStatus})`);
                    }
                } else {
                    // This could be an incoming message or a log we missed during sending
                    console.log(`ℹ️ Message ID ${messageId} not in logs. Checking for incoming...`);
                }
            } catch (statusErr) {
                console.error('❌ Error updating message status:', statusErr.message);
            }
        }

        res.status(200).json({ success: true, message: 'Dotgo webhook processed' });

    } catch (error) {
        console.error('❌ Dotgo Webhook Error:', error.message);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

// GET /api/webhooks/message-logs
// Fetch consolidated logs (one row per message) for reporting
router.get('/message-logs', async (req, res) => {
    try {
        const { campaignId } = req.query;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        let baseSql = ' FROM message_logs WHERE 1=1';
        let params = [];

        if (campaignId) {
            baseSql += ' AND campaign_id = ?';
            params.push(campaignId);
        }

        if (req.query.startDate && req.query.endDate) {
            baseSql += ' AND created_at BETWEEN ? AND ?';
            params.push(req.query.startDate + ' 00:00:00', req.query.endDate + ' 23:59:59');
        }

        if (req.query.search) {
            baseSql += ' AND (recipient LIKE ? OR campaign_name LIKE ? OR template_name LIKE ?)';
            const searchVal = `%${req.query.search}%`;
            params.push(searchVal, searchVal, searchVal);
        }

        // Get total count
        const countSql = `SELECT COUNT(*) as total ${baseSql}`;
        const [countResult] = await query(countSql, params);
        const total = countResult[0].total;

        // Get paginated data
        const selectSql = `SELECT * ${baseSql} ORDER BY updated_at DESC LIMIT ? OFFSET ?`;
        const [logs] = await query(selectSql, [...params, limit, offset]);

        res.json({
            success: true,
            data: logs,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('❌ Error fetching message logs:', error.message);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

// GET /api/webhooks/logs
// Fetch last 50 webhook logs for debugging/viewing
router.get('/logs', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        let baseSql = ' FROM webhook_logs WHERE 1=1';
        let params = [];

        if (req.query.startDate && req.query.endDate) {
            baseSql += ' AND created_at BETWEEN ? AND ?';
            params.push(req.query.startDate + ' 00:00:00', req.query.endDate + ' 23:59:59');
        }

        if (req.query.search) {
            baseSql += ' AND (recipient LIKE ? OR message_id_envelope LIKE ?)';
            const searchVal = `%${req.query.search}%`;
            params.push(searchVal, searchVal);
        }

        // Get total count
        const [countResult] = await query(`SELECT COUNT(*) as total ${baseSql}`, params);
        const total = countResult[0].total;

        // Get paginated data
        const [logs] = await query(`SELECT * ${baseSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`, [...params, limit, offset]);

        res.json({
            success: true,
            data: logs,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('❌ Error fetching webhook logs:', error.message);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

module.exports = router;

