const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const authenticateToken = require('../middleware/authMiddleware');
const { triggerChatflow } = require('../services/chatflowService');
const { processAutomation } = require('../services/automationService');

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
                const [result] = await query(
                    'INSERT INTO webhook_logs (user_id, sender, recipient, message_content, raw_payload, status, type) SELECT user_id, ?, ?, ?, ?, "received", "rcs" FROM message_logs WHERE message_id = ? LIMIT 1',
                    [sender, payload.recipient || 'System', text, JSON.stringify(payload), payload.messageId]
                );

                // If message_logs didn't find a user_id (e.g. unsolicited message), we might need a fallback
                // For now, let's assume we match it.

                // Notify via Socket.io
                if (req.io) {
                    // We need to find the user_id for this sender/message
                    const [msgOwner] = await query('SELECT user_id FROM message_logs WHERE message_id = ? LIMIT 1', [payload.messageId]);
                    if (msgOwner.length > 0) {
                        const targetUserId = msgOwner[0].user_id;
                        req.io.to(`user_${targetUserId}`).emit('new_message', {
                            sender,
                            message_content: text,
                            created_at: new Date(),
                            status: 'received',
                            type: 'rcs'
                        });

                        // 🤖 CHECK CHATFLOWS — auto-reply if keyword matched
                        triggerChatflow(targetUserId, sender, text, 'rcs', req.io).catch(e =>
                            console.error('[ChatFlow] RCS trigger error:', e.message)
                        );

                        // 🤖 CHECK AUTOMATIONS — graph-based logic
                        processAutomation(targetUserId, 'new_message', 'rcs', { 
                            sender, 
                            message_content: text, 
                            messageId: payload.messageId 
                        }, req.io).catch(e =>
                            console.error('[AutomationService] RCS trigger error:', e.message)
                        );
                    }
                }
                console.log(`✅ Saved incoming message from ${sender} to DB and notified via Socket.`);
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
        const recipient = decodedData.senderPhoneNumber || decodedData.userPhoneNumber || decodedData.destinationPhoneNumber || decodedData.recipient;
        
        let finalStatus = 'unknown';
        if (eventType) {
            const et = eventType.toLowerCase();
            if (et === 'message' || et === 'text' || et.includes('received')) finalStatus = 'received';
            else if (et === 'delivered') finalStatus = 'delivered';
            else if (et === 'displayed' || et === 'read') finalStatus = 'read';
            else if (et === 'failed') finalStatus = 'failed';
            else finalStatus = et;
        } else if (decodedData.text || decodedData.message || (decodedData.response && decodedData.response.text)) {
            finalStatus = 'received';
        }

        const messageContent = decodedData.text || decodedData.message || (decodedData.response && decodedData.response.text) || null;
        const sender = decodedData.senderPhoneNumber || decodedData.userPhoneNumber || null;

        console.log(`📊 Dotgo Status: ${finalStatus} (MsgID: ${messageId}) for ${recipient}`);
        if (messageContent) console.log(`💬 Dotgo Message Content: ${messageContent} from ${sender}`);

        // 2. Save/Update webhook_logs (Smart UPSERT logic)
        try {
            // Robust userId resolution
            let userId = null;
            
            // Step A: Try matching by existing messageId (Delivery Reports)
            if (messageId) {
                const [ownerLookup] = await query('SELECT user_id FROM message_logs WHERE message_id = ? LIMIT 1', [messageId]);
                if (ownerLookup.length > 0) {
                    userId = ownerLookup[0].user_id;
                }
            }

            // Step B: If still null (Incoming Message/Reply), try matching by Bot ID + Sender
            if (!userId) {
                const botId = payload.message?.attributes?.business_id || payload.message?.attributes?.bot_id;
                if (botId && sender) {
                    // 1. Find the config
                    const [configs] = await query('SELECT id FROM rcs_configs WHERE bot_id = ? LIMIT 1', [botId]);
                    if (configs.length > 0) {
                        const configId = configs[0].id;
                        
                        // 2. Find who last chatted with this person on this config
                        const [lastChat] = await query(
                            `SELECT user_id FROM message_logs 
                             WHERE recipient = ? 
                             AND user_id IN (SELECT id FROM users WHERE rcs_config_id = ?)
                             ORDER BY created_at DESC LIMIT 1`,
                            [sender.replace(/\D/g, ''), configId]
                        );
                        
                        if (lastChat.length > 0) {
                            userId = lastChat[0].user_id;
                        } else {
                            // 3. Fallback: First user assigned to this config
                            const [fallbackUser] = await query('SELECT id FROM users WHERE rcs_config_id = ? LIMIT 1', [configId]);
                            if (fallbackUser.length > 0) {
                                userId = fallbackUser[0].id;
                            }
                        }
                    }
                }
            }

            const [existing] = await query('SELECT id FROM webhook_logs WHERE message_id = ? LIMIT 1', [messageId]);

            if (existing.length > 0) {
                // UPDATE existing row
                await query(
                    `UPDATE webhook_logs SET 
                    user_id = COALESCE(?, user_id),
                    sender = COALESCE(?, sender),
                    message_content = COALESCE(?, message_content),
                    status = ?, 
                    event_type = ?, 
                    type = 'rcs',
                    raw_payload = ?,
                    received_time = COALESCE(?, received_time),
                    publish_time = COALESCE(?, publish_time),
                    updated_at = NOW()
                    WHERE id = ?`,
                    [
                        userId,
                        sender,
                        messageContent,
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
                    (user_id, sender, message_content, received_time, recipient, message_id, subscription, message_data, product, business_id, type, project_number, event_type, message_id_envelope, publish_time, raw_payload, status) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'rcs', ?, ?, ?, ?, ?, ?)`,
                    [
                        userId,
                        sender,
                        messageContent,
                        payload.receivedTime || null,
                        recipient || null,
                        messageId || null,
                        payload.subscription || null,
                        payload.message?.data || null,
                        payload.message?.attributes?.product || null,
                        payload.message?.attributes?.business_id || null,
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
        if (messageId || recipient) {
            try {
                // Try matching by message_id first
                let [logs] = await query('SELECT * FROM message_logs WHERE message_id = ?', [messageId]);

                // Fallback: Match by recipient if message_id is 'N/A' or not found
                if (logs.length === 0 && recipient) {
                    const cleanRecipient = recipient.replace(/\D/g, ''); // Remove all non-digits (919918...)
                    console.log(`🔍 No ID match for ${messageId}. Searching by recipient: ${cleanRecipient}`);

                    [logs] = await query(
                        'SELECT * FROM message_logs WHERE (recipient = ? OR recipient = ?) AND (message_id = "N/A" OR message_id IS NULL OR status = "sent") ORDER BY created_at DESC LIMIT 1',
                        [cleanRecipient, `+${cleanRecipient}`]
                    );

                    if (logs.length > 0) {
                        console.log(`✨ REPAIR: Found log ID ${logs[0].id} for ${recipient}. Linking UUID: ${messageId}`);
                        await query('UPDATE message_logs SET message_id = ? WHERE id = ?', [messageId, logs[0].id]);
                    }
                }

                if (logs.length > 0) {
                    const log = logs[0];
                    const oldStatus = (log.status || '').toLowerCase();

                    // Only update if status is actually different
                    if (oldStatus !== finalStatus) {
                        console.log(`📝 Updating Log ${log.id}: ${oldStatus} -> ${finalStatus}`);

                        await query('UPDATE message_logs SET status = ?, updated_at = NOW() WHERE id = ?', [finalStatus, log.id]);

                        // Handle Timestamps
                        if (finalStatus === 'delivered') {
                            await query('UPDATE message_logs SET delivery_time = NOW() WHERE id = ?', [log.id]);
                        } else if (finalStatus === 'read') {
                            await query('UPDATE message_logs SET read_time = NOW(), delivery_time = COALESCE(delivery_time, NOW()) WHERE id = ?', [log.id]);
                        } else if (finalStatus === 'failed') {
                            const reason = decodedData.reason || decodedData.description || decodedData.error || 'Provider rejected (Check raw data)';
                            await query('UPDATE message_logs SET failure_reason = ? WHERE id = ?', [reason, log.id]);
                        }

                        // Handle Campaign Counters (Real-time updates)
                        if (log.campaign_id) {
                            if (finalStatus === 'delivered' && oldStatus !== 'delivered' && oldStatus !== 'read') {
                                await query('UPDATE campaigns SET delivered_count = delivered_count + 1 WHERE id = ?', [log.campaign_id]);
                                console.log(`📈 Campaign ${log.campaign_id}: Delivered count +1`);
                            } else if (finalStatus === 'read' && oldStatus !== 'read') {
                                if (oldStatus !== 'delivered') {
                                    await query('UPDATE campaigns SET delivered_count = delivered_count + 1, read_count = read_count + 1 WHERE id = ?', [log.campaign_id]);
                                    console.log(`📈 Campaign ${log.campaign_id}: Delivered & Read count +1`);
                                } else {
                                    await query('UPDATE campaigns SET read_count = read_count + 1 WHERE id = ?', [log.campaign_id]);
                                    console.log(`📈 Campaign ${log.campaign_id}: Read count +1`);
                                }
                            } else if (finalStatus === 'failed' && oldStatus !== 'failed') {
                                await query('UPDATE campaigns SET failed_count = failed_count + 1 WHERE id = ?', [log.campaign_id]);
                                console.log(`📉 Campaign ${log.campaign_id}: Failed count +1`);
                            }
                        }
                    } else {
                        console.log(`ℹ️ Status for Log ${log.id} is already ${oldStatus}. No update needed.`);
                    }

                    // 📡 REAL-TIME CHAT UPDATE (Socket.io)
                    // If it's a new received message (not just a status update)
                    if (finalStatus === 'received' && messageContent && req.io) {
                        const targetUserId = userId || log.user_id;
                        if (targetUserId) {
                            req.io.to(`user_${targetUserId}`).emit('new_message', {
                                id: messageId || log.id,
                                sender: sender || recipient,
                                message_content: messageContent,
                                created_at: new Date(),
                                status: 'received',
                                type: 'rcs'
                            });
                            console.log(`📡 Emitted RCS new_message to user_${targetUserId}`);

                            // 🤖 CHECK CHATFLOWS — auto-reply if keyword matched
                            triggerChatflow(targetUserId, sender || recipient, messageContent, 'rcs', req.io).catch(e =>
                                console.error('[ChatFlow] RCS trigger error:', e.message)
                            );

                            // 🤖 CHECK AUTOMATIONS — graph-based logic
                            processAutomation(targetUserId, 'new_message', 'rcs', {
                                sender: sender || recipient,
                                message_content: messageContent,
                                messageId: messageId || log.message_id
                            }, req.io).catch(e =>
                                console.error('[AutomationService] RCS trigger error:', e.message)
                            );
                        }
                    }
                } else {
                    console.log(`ℹ️ No matching log found for MsgID: ${messageId}, Recipient: ${recipient}`);

                    // 📡 Fallback for unsolicited incoming messages
                    if (finalStatus === 'received' && messageContent && req.io && sender) {
                        // For RCS, we need a way to assign this to a user. 
                        // Let's at least try to find a user who has active RCS agents if possible, 
                        // or just log it to webhook_logs (already done above).
                        console.warn(`⚠️ Unsolicited RCS message from ${sender}. No owner found.`);
                    }
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
router.get('/message-logs', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { campaignId } = req.query;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        let baseSql = ' FROM message_logs ml LEFT JOIN campaigns c ON ml.campaign_id = c.id WHERE 1=1';
        let params = [];

        // Filter by userId
        const targetUserId = req.query.userId || req.user.id;
        if (req.user.role === 'superadmin' || req.user.role === 'admin') {
            if (req.query.userId) {
                baseSql += ' AND ml.user_id = ?';
                params.push(req.query.userId);
            }
        } else {
            baseSql += ' AND ml.user_id = ?';
            params.push(req.user.id);
        }

        if (campaignId) {
            baseSql += ' AND ml.campaign_id = ?';
            params.push(campaignId);
        }

        if (req.query.channel && req.query.channel !== 'all') {
            baseSql += ' AND c.channel = ?';
            params.push(req.query.channel);
        }

        if (req.query.source === 'api') {
            baseSql += " AND ml.campaign_id LIKE 'CAMP_API_%'";
        } else if (req.query.source === 'manual') {
            baseSql += " AND (ml.campaign_id NOT LIKE 'CAMP_API_%' OR ml.campaign_id IS NULL)";
        }

        if (req.query.startDate && req.query.endDate) {
            baseSql += ' AND ml.created_at BETWEEN ? AND ?';
            params.push(req.query.startDate + ' 00:00:00', req.query.endDate + ' 23:59:59');
        }

        if (req.query.search) {
            baseSql += ' AND (ml.recipient LIKE ? OR ml.campaign_name LIKE ? OR ml.template_name LIKE ?)';
            const searchVal = `%${req.query.search}%`;
            params.push(searchVal, searchVal, searchVal);
        }

        // Get total count
        const countSql = `SELECT COUNT(*) as total ${baseSql}`;
        const [countResult] = await query(countSql, params);
        const total = countResult[0].total;

        // Get paginated data
        const selectSql = `SELECT ml.*, c.channel ${baseSql} ORDER BY ml.id DESC LIMIT ? OFFSET ?`;
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
// Fetch last 50 webhook logs for debugging/viewing (Admin only or isolated per user)
router.get('/logs', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        let baseSql = ' FROM webhook_logs WHERE user_id = ?';
        let params = [userId];

        // If user is admin, allow seeing all logs? No, keep it separate for now.
        if (req.user.role === 'admin' || req.user.role === 'superadmin') {
            // Admin sees everything
            baseSql = ' FROM webhook_logs WHERE 1=1';
            params = [];
        }

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

// ==========================================
// WHATSAPP WEBHOOKS
// ==========================================

// GET /api/webhooks/whatsapp/callback
// WhatsApp Webhook Verification
router.get('/whatsapp/callback', (req, res) => {
    try {
        const verify_token = process.env.WHATSAPP_VERIFY_TOKEN || "notifynow_wa_token_123";

        let mode = req.query["hub.mode"];
        let token = req.query["hub.verify_token"];
        let challenge = req.query["hub.challenge"];

        if (mode && token) {
            if (mode === "subscribe" && token === verify_token) {
                console.log("✅ WHATSAPP WEBHOOK VERIFIED");
                res.status(200).send(challenge);
            } else {
                console.log("❌ WHATSAPP WEBHOOK VERIFICATION FAILED. Token mismatch.");
                res.sendStatus(403);
            }
        } else {
            res.status(400).send("Missing parameters");
        }
    } catch (error) {
        console.error('❌ WhatsApp Webhook GET Error:', error.message);
        res.status(500).send("Error");
    }
});

// POST /api/webhooks/whatsapp/callback
// WhatsApp Incoming Messages and Delivery Reports
router.post('/whatsapp/callback', async (req, res) => {
    try {
        const payload = req.body;

        console.log('==============================================');
        console.log('📨 RECEIVED WHATSAPP WEBHOOK');
        console.log('Timestamp:', new Date().toISOString());
        console.log('Payload:', JSON.stringify(payload, null, 2));
        console.log('==============================================');

        if (payload.object === "whatsapp_business_account") {
            for (let entry of payload.entry) {
                for (let change of entry.changes) {
                    let value = change.value;

                    // 1. DELIVERY REPORTS (Statuses)
                    if (value.statuses && value.statuses.length > 0) {
                        for (let statusObj of value.statuses) {
                            const messageId = statusObj.id;
                            const status = statusObj.status; // sent, delivered, read, failed
                            const recipientId = statusObj.recipient_id;

                            let errorReason = null;
                            if (status === 'failed' && statusObj.errors) {
                                errorReason = statusObj.errors[0]?.title || statusObj.errors[0]?.message || 'Unknown error';
                            }

                            console.log(`📊 WA DLR Update: Msg ${messageId} is ${status} for ${recipientId}`);

                            // Update logic based on messageId
                            try {
                                const [logs] = await query('SELECT * FROM message_logs WHERE message_id = ?', [messageId]);
                                if (logs.length > 0) {
                                    const log = logs[0];
                                    let finalStatus = status.toLowerCase();

                                    await query('UPDATE message_logs SET status = ?, updated_at = NOW() WHERE message_id = ?', [finalStatus, messageId]);

                                    if (finalStatus === 'delivered') {
                                        await query('UPDATE message_logs SET delivery_time = NOW() WHERE message_id = ?', [messageId]);
                                    } else if (finalStatus === 'read') {
                                        await query('UPDATE message_logs SET read_time = NOW(), delivery_time = COALESCE(delivery_time, NOW()) WHERE message_id = ?', [messageId]);
                                    } else if (finalStatus === 'failed') {
                                        await query('UPDATE message_logs SET failure_reason = ? WHERE message_id = ?', [errorReason, messageId]);
                                    }

                                    // Update Campaign Counts
                                    if (log.campaign_id) {
                                        if (finalStatus === 'delivered' && log.status !== 'delivered' && log.status !== 'read') {
                                            await query('UPDATE campaigns SET delivered_count = delivered_count + 1 WHERE id = ?', [log.campaign_id]);
                                        } else if (finalStatus === 'read' && log.status !== 'read') {
                                            if (log.status !== 'delivered') {
                                                await query('UPDATE campaigns SET delivered_count = delivered_count + 1, read_count = read_count + 1 WHERE id = ?', [log.campaign_id]);
                                            } else {
                                                await query('UPDATE campaigns SET read_count = read_count + 1 WHERE id = ?', [log.campaign_id]);
                                            }
                                        } else if (finalStatus === 'failed') {
                                            await query('UPDATE campaigns SET failed_count = failed_count + 1 WHERE id = ?', [log.campaign_id]);
                                        }
                                    }
                                } else {
                                    // Sometimes messageId doesn't exactly match if it's external, or they come back slightly differently.
                                    // You could add logic here to match by recipient and time if needed.
                                    console.warn(`⚠️ WA Message ID ${messageId} not found in logs.`);
                                }
                            } catch (error) {
                                console.error('❌ Error handling WA DLR:', error.message);
                            }
                        }
                    }

                    // 2. INCOMING MESSAGES
                    if (value.messages && value.messages.length > 0) {
                        for (let msg of value.messages) {
                            const sender = msg.from; // Sender phone number
                            const msgId = msg.id;
                            let text = '';

                            if (msg.type === 'text') {
                                text = msg.text.body;
                            } else if (msg.type === 'button') {
                                text = msg.button.text;
                            } else if (msg.type === 'interactive') {
                                if (msg.interactive.type === 'button_reply') {
                                    text = msg.interactive.button_reply.id || msg.interactive.button_reply.title;
                                } else if (msg.interactive.type === 'list_reply') {
                                    text = msg.interactive.list_reply.id || msg.interactive.list_reply.title;
                                }
                            } else {
                                text = `[Received ${msg.type} message]`;
                            }

                            console.log(`💬 Incoming WA Reply from ${sender}: ${text}`);

                            try {
                                // 1. Identify User ID
                                let userId = null;
                                const phoneId = value.metadata?.phone_number_id;

                                // Try to find who last chatted with this person on this phone ID
                                if (phoneId) {
                                    const [lastChat] = await query(
                                        `SELECT user_id FROM message_logs 
                                         WHERE recipient = ? 
                                         AND user_id IN (SELECT id FROM users WHERE whatsapp_config_id = (SELECT id FROM whatsapp_configs WHERE ph_no_id = ? LIMIT 1))
                                         ORDER BY created_at DESC LIMIT 1`,
                                        [sender, phoneId]
                                    );
                                    if (lastChat.length > 0) {
                                        userId = lastChat[0].user_id;
                                    }
                                }

                                // Fallback: Just pick the first user assigned to this WhatsApp configuration
                                if (!userId && phoneId) {
                                    const [fallbackUser] = await query(
                                        'SELECT id FROM users WHERE whatsapp_config_id = (SELECT id FROM whatsapp_configs WHERE ph_no_id = ? LIMIT 1) LIMIT 1',
                                        [phoneId]
                                    );
                                    if (fallbackUser.length > 0) {
                                        userId = fallbackUser[0].id;
                                    }
                                }

                                // 2. Save to webhook_logs
                                const [result] = await query(
                                    'INSERT INTO webhook_logs (user_id, sender, recipient, message_content, raw_payload, status, type, message_id_envelope) VALUES (?, ?, ?, ?, ?, "received", "whatsapp", ?)',
                                    [userId, sender, value.metadata?.display_phone_number || 'System', text, JSON.stringify(payload), msgId]
                                );

                                // 3. Notify via Socket.io for real-time chat
                                if (req.io && userId) {
                                    req.io.to(`user_${userId}`).emit('new_message', {
                                        id: result.insertId,
                                        sender,
                                        recipient: value.metadata?.display_phone_number || 'System',
                                        message_content: text,
                                        created_at: new Date(),
                                        status: 'received',
                                        type: 'whatsapp'
                                    });
                                    console.log(`📡 Emitted new_message to user_${userId}`);
                                }

                                // 🤖 CHECK CHATFLOWS — auto-reply if keyword matched
                                if (userId) {
                                    triggerChatflow(userId, sender, text, 'whatsapp', req.io, {
                                        phoneId: value.metadata?.phone_number_id
                                    }).catch(e => console.error('[ChatFlow] WA trigger error:', e.message));

                                    // 🤖 CHECK AUTOMATIONS — graph-based logic
                                    processAutomation(userId, 'new_message', 'whatsapp', { 
                                        sender, 
                                        message_content: text, 
                                        messageId: msgId,
                                        metadata: value.metadata 
                                    }, req.io).catch(e => console.error('[AutomationService] WA trigger error:', e.message));
                                }

                                console.log(`✅ Saved incoming WA message from ${sender} to DB (User: ${userId}).`);
                            } catch (dbErr) {
                                console.error('❌ Failed to save incoming WA message:', dbErr.message);
                            }
                        }
                    }
                }
            }
            res.sendStatus(200);
        } else {
            res.sendStatus(404);
        }
    } catch (error) {
        console.error('❌ WA Webhook Error:', error.message);
        res.status(500).send("Internal Error");
    }
});

// GET /api/webhooks/whatsapp
// Quick check to see if WhatsApp logs are storing correctly from browser
router.get('/whatsapp', async (req, res) => {
    console.log('🔍 GET /api/webhooks/whatsapp hit');
    try {
        const [logs] = await query("SELECT * FROM webhook_logs WHERE type = 'whatsapp' ORDER BY created_at DESC LIMIT 20");
        res.json({
            success: true,
            message: 'Latest 20 WhatsApp Webhook Logs',
            data: logs
        });
    } catch (error) {
        console.error('❌ Error fetching whatsapp logs:', error.message);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

module.exports = router;

