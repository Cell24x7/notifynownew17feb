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
        console.log('Payload:', JSON.stringify(payload, null, 2));
        console.log('==============================================');

        // 1. DELIVERY REPORTS (DLR)
        if (payload.status && (payload.messageId || (payload.message && payload.message.name))) {
            let messageId = payload.messageId;
            const status = payload.status;
            const error = payload.error;

            if (!messageId && payload.message && payload.message.name) {
                const parts = payload.message.name.split('/');
                messageId = parts[parts.length - 1]; 
            }

            try {
                let [logs] = [];
                let isApiLog = false;
                let attempts = 0;
                while (attempts < 10) {
                    [logs] = await query('SELECT * FROM message_logs WHERE message_id = ?', [messageId]);
                    if (logs.length === 0) {
                        [logs] = await query('SELECT * FROM api_message_logs WHERE message_id = ?', [messageId]);
                        if (logs.length > 0) { isApiLog = true; break; }
                    } else { break; }
                    attempts++;
                    if (attempts < 10) await new Promise(resolve => setTimeout(resolve, 500));
                }

                if (logs.length > 0) {
                    const log = logs[0];
                    const finalStatus = (status || '').toLowerCase();
                    const logsTable = isApiLog ? 'api_message_logs' : 'message_logs';
                    const campaignsTable = isApiLog ? 'api_campaigns' : 'campaigns';

                    const weights = { sent: 1, delivered: 2, read: 3, failed: 0 };
                    const oldStatus = (log.status || 'sent').toLowerCase();

                    if ((weights[finalStatus] || 0) > (weights[oldStatus] || 0)) {
                        await query(`UPDATE ${logsTable} SET status = ?, updated_at = NOW() WHERE message_id = ?`, [finalStatus, messageId]);

                        if (log.campaign_id) {
                            if (finalStatus === 'delivered' && oldStatus !== 'delivered' && oldStatus !== 'read') {
                                await query(`UPDATE ${campaignsTable} SET delivered_count = delivered_count + 1 WHERE id = ?`, [log.campaign_id]);
                                await query(`UPDATE ${logsTable} SET delivery_time = NOW() WHERE message_id = ?`, [messageId]);
                            } 
                            else if (finalStatus === 'read' && oldStatus !== 'read') {
                                if (oldStatus !== 'delivered') {
                                    await query(`UPDATE ${campaignsTable} SET delivered_count = delivered_count + 1, read_count = read_count + 1 WHERE id = ?`, [log.campaign_id]);
                                } else {
                                    await query(`UPDATE ${campaignsTable} SET read_count = read_count + 1 WHERE id = ?`, [log.campaign_id]);
                                }
                                await query(`UPDATE ${logsTable} SET read_time = NOW(), delivery_time = COALESCE(delivery_time, NOW()) WHERE message_id = ?`, [messageId]);
                            } 
                            else if (finalStatus === 'failed' && oldStatus !== 'failed') {
                                await query(`UPDATE ${campaignsTable} SET failed_count = failed_count + 1 WHERE id = ?`, [log.campaign_id]);
                                await query(`UPDATE ${logsTable} SET failure_reason = ? WHERE message_id = ?`, [error || 'Unknown error', messageId]);
                            }
                        }
                    }
                    console.log(`✅ Updated RCS status for ${messageId} to ${finalStatus}`);
                } else {
                    console.warn(`⚠️ RCS Message ID ${messageId} not found in logs after retries.`);
                }
            } catch (dbErr) {
                console.error('❌ Database Error updating RCS DLR:', dbErr.message);
            }
        }

        // 2. INCOMING MESSAGES (Replies)
        if (payload.sender && (payload.message || payload.text)) {
            const sender = payload.sender;
            const text = payload.message || payload.text;
            console.log(`💬 Incoming RCS Reply from ${sender}: ${text}`);

            try {
                // Determine user_id from previous message record
                const [owner] = await query('SELECT user_id FROM message_logs WHERE recipient LIKE ? ORDER BY id DESC LIMIT 1', [`%${sender.slice(-10)}%`]);
                const userId = owner.length > 0 ? owner[0].user_id : 1;

                await query(
                    'INSERT INTO webhook_logs (user_id, sender, recipient, message_content, raw_payload, status, type, channel) VALUES (?, ?, ?, ?, ?, "received", "rcs", "rcs")',
                    [userId, sender, 'System', text, JSON.stringify(payload)]
                );

                if (req.io) {
                    req.io.to(`user_${userId}`).emit('new_message', { sender, message_content: text, created_at: new Date(), status: 'received', type: 'rcs' });
                    triggerChatflow(userId, sender, text, 'rcs', req.io).catch(() => {});
                    processAutomation(userId, 'new_message', 'rcs', { sender, message_content: text }, req.io).catch(() => {});
                }
            } catch (err) { console.error('❌ Error handling RCS reply:', err.message); }
        }

        res.status(200).json({ success: true, message: 'RCS callback processed' });
    } catch (error) {
        console.error('❌ RCS Callback Error:', error.message);
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
            console.log('ℹ️ Dotgo Heartbeat or empty payload received. Returning 200.');
            return res.status(200).json({ success: true, message: 'Heartbeat acknowledged' });
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

        // Robust messageId extraction for Dotgo (check name field if messageId missing)
        const messageId = decodedData.messageId || decodedData.messageID || payload.message?.messageId || (payload.message?.name ? payload.message.name.split('/').pop() : null);
        const eventType = decodedData.eventType || payload.message?.attributes?.event_type;
        
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
        
        // Identify participants
        const rawSender = decodedData.senderPhoneNumber || decodedData.userPhoneNumber || null;
        const rawRecipient = decodedData.destinationPhoneNumber || decodedData.recipient || null;
        
        const cleanSender = rawSender ? rawSender.replace(/\D/g, '') : null;
        const cleanRecipient = rawRecipient ? rawRecipient.replace(/\D/g, '') : null;

        // For incoming messages, the person we are talking to is the SENDER.
        // For outgoing/DLRs, the person we are talking to is the RECIPIENT.
        // IMPORTANT: In Dotgo DLR events (delivered/failed/read), destinationPhoneNumber is often missing.
        // In that case, senderPhoneNumber IS actually the recipient (the person message was sent TO).
        let contactPhone;
        if (finalStatus === 'received') {
            contactPhone = cleanSender;
        } else {
            contactPhone = cleanRecipient || cleanSender; // Fallback to sender for DLR events
        }

        console.log(`📊 Dotgo Status: ${finalStatus} (MsgID: ${messageId}) | Contact: ${contactPhone}`);
        if (messageContent) console.log(`💬 Dotgo Message Content: ${messageContent} from ${cleanSender}`);

        // userId needs to be available for both webhook_logs AND message_logs sections
        let userId = null;

        // 2. Save/Update webhook_logs (Smart UPSERT logic)
        try {
            
            // Step A: Try matching by existing messageId (Delivery Reports)
            if (messageId) {
                const [ownerLookup] = await query('SELECT user_id FROM message_logs WHERE message_id = ? LIMIT 1', [messageId]);
                if (ownerLookup.length > 0) {
                    userId = ownerLookup[0].user_id;
                }
            }

            // Step B: If still null, try matching by Bot ID + contactPhone
            if (!userId) {
                const botId = payload.message?.attributes?.business_id || payload.message?.attributes?.bot_id;
                
                // Step B1: Try by botId + contactPhone
                if (botId && contactPhone) {
                    const [configs] = await query('SELECT id FROM rcs_configs WHERE bot_id = ? LIMIT 1', [botId]);
                    if (configs.length > 0) {
                        const configId = configs[0].id;
                        
                        const [lastChat] = await query(
                            `SELECT user_id FROM message_logs 
                             WHERE recipient LIKE ? 
                             AND user_id IN (SELECT id FROM users WHERE rcs_config_id = ?)
                             ORDER BY created_at DESC LIMIT 1`,
                            [`%${contactPhone.slice(-10)}%`, configId]
                        );
                        
                        if (lastChat.length > 0) {
                            userId = lastChat[0].user_id;
                        } else {
                            const [fallbackUser] = await query('SELECT id FROM users WHERE rcs_config_id = ? LIMIT 1', [configId]);
                            if (fallbackUser.length > 0) {
                                userId = fallbackUser[0].id;
                            }
                        }
                    }
                }
                
                // Step B2: If still null and we have botId, just find any user with this config
                if (!userId) {
                    const botId2 = payload.message?.attributes?.business_id || payload.message?.attributes?.bot_id;
                    if (botId2) {
                        const [configs2] = await query('SELECT id FROM rcs_configs WHERE bot_id = ? LIMIT 1', [botId2]);
                        if (configs2.length > 0) {
                            const [fallbackUser2] = await query('SELECT id FROM users WHERE rcs_config_id = ? LIMIT 1', [configs2[0].id]);
                            if (fallbackUser2.length > 0) {
                                userId = fallbackUser2[0].id;
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
                        cleanSender,
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
                        cleanSender,
                        messageContent,
                        payload.receivedTime || null,
                        contactPhone || null,
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
        if (messageId || contactPhone) {
            try {
                // Try matching by message_id first (checks both manual and API logs)
                let [logs] = await query('SELECT * FROM message_logs WHERE message_id = ?', [messageId]);
                let isApiLog = false;
                
                if (logs.length === 0) {
                    [logs] = await query('SELECT * FROM api_message_logs WHERE message_id = ?', [messageId]);
                    if (logs.length > 0) isApiLog = true;
                }

                // Fallback: Match by contactPhone (last 10 digits) if message_id not found
                if (logs.length === 0 && contactPhone) {
                    const last10 = contactPhone.slice(-10);
                    console.log(`🔍 No ID match for ${messageId}. Searching by recipient (last 10): ${last10}`);

                    [logs] = await query(
                        `SELECT * FROM message_logs WHERE (recipient LIKE ? OR recipient LIKE ?) AND (message_id = 'N/A' OR message_id IS NULL OR status = 'sent') ORDER BY created_at DESC LIMIT 1`,
                        [`%${last10}`, `%${last10}%`]
                    );

                    if (logs.length > 0) {
                        console.log(`✨ REPAIR: Found log ID ${logs[0].id} for ${contactPhone}. Linking UUID: ${messageId}`);
                        await query('UPDATE message_logs SET message_id = ? WHERE id = ?', [messageId, logs[0].id]);
                    }
                }

                if (logs.length === 0 && process.env.APP_NAME === 'notifynow-production') {
                    // RELAY: This report does not belong to Production database.
                    // Forward it to the Developer app so its reports also work!
                    console.log(`📡 [Relay] Unknown DLR ${messageId}. Forwarding to Developer instance...`);
                    const axios = require('axios');
                    const devUrl = 'https://developer.notifynow.in/api/webhooks/dotgo';
                    axios.post(devUrl, req.body, { headers: { 'x-relay': 'true' } }).catch(e => {
                        if (!e.response || e.response.status !== 404) console.error('[Relay] Forwarding failed:', e.message);
                    });
                }

                if (logs.length > 0) {
                    const log = logs[0];
                    const oldStatus = (log.status || '').toLowerCase();

                    // Only update if status is actually different
                    if (oldStatus !== finalStatus) {
                        // Hierarchy Protection: Don't downgrade status (e.g., if 'sent' comes after 'delivered')
                        const statusWeights = { 'sent': 1, 'delivered': 2, 'displayed': 3, 'read': 4, 'failed': -1, 'received': 10 };
                        if ((statusWeights[finalStatus] || 0) < (statusWeights[oldStatus] || 0) && finalStatus !== 'failed') {
                            console.log(`⚠️ Prevented status downgrade for ${log.id}: ${oldStatus} -> ${finalStatus}`);
                            return res.status(200).json({ success: true, message: 'Status downgrade ignored' });
                        }

                        console.log(`📝 Updating Log ${log.id}: ${oldStatus} -> ${finalStatus}`);

                        const logsTable = isApiLog ? 'api_message_logs' : 'message_logs';
                        const campaignsTable = isApiLog ? 'api_campaigns' : 'campaigns';

                        await query(`UPDATE ${logsTable} SET status = ?, updated_at = NOW() WHERE id = ?`, [finalStatus, log.id]);

                        // 📡 REAL-TIME CHAT STATUS UPDATE (ONLY for manual messages to prevent browser hang during 1Cr campaigns)
                        if (['delivered', 'read', 'displayed', 'failed'].includes(finalStatus) && req.io && !log.campaign_id) {
                            const socketUser = userId || log.user_id;
                            if (socketUser) {
                                req.io.to(`user_${socketUser}`).emit('message_status_update', {
                                    message_id: messageId || log.message_id,
                                    status: finalStatus
                                });
                                console.log(`📡 Emitted Status Update (${finalStatus}) for manual msg ${messageId} to user_${socketUser}`);
                            }
                        }

                        // Handle Timestamps
                        if (finalStatus === 'delivered') {
                            await query(`UPDATE ${logsTable} SET delivery_time = NOW() WHERE id = ?`, [log.id]);
                        } else if (finalStatus === 'read') {
                            await query(`UPDATE ${logsTable} SET read_time = NOW(), delivery_time = COALESCE(delivery_time, NOW()) WHERE id = ?`, [log.id]);
                        } else if (finalStatus === 'failed') {
                            const reason = decodedData.reason || decodedData.description || decodedData.error || 'Provider rejected (Check raw data)';
                            await query(`UPDATE ${logsTable} SET failure_reason = ? WHERE id = ?`, [reason, log.id]);
                        }

                        // Handle Campaign Counters (Real-time updates)
                        if (log.campaign_id) {
                            if (finalStatus === 'delivered' && oldStatus !== 'delivered' && oldStatus !== 'read') {
                                await query(`UPDATE ${campaignsTable} SET delivered_count = delivered_count + 1 WHERE id = ?`, [log.campaign_id]);
                                console.log(`📈 Campaign ${log.campaign_id}: Delivered count +1`);
                            } else if (finalStatus === 'read' && oldStatus !== 'read') {
                                if (oldStatus !== 'delivered') {
                                    await query(`UPDATE ${campaignsTable} SET delivered_count = delivered_count + 1, read_count = read_count + 1 WHERE id = ?`, [log.campaign_id]);
                                    console.log(`📈 Campaign ${log.campaign_id}: Delivered & Read count +1`);
                                } else {
                                    await query(`UPDATE ${campaignsTable} SET read_count = read_count + 1 WHERE id = ?`, [log.campaign_id]);
                                    console.log(`📈 Campaign ${log.campaign_id}: Read count +1`);
                                }
                            } else if (finalStatus === 'failed' && oldStatus !== 'failed') {
                                await query(`UPDATE ${campaignsTable} SET failed_count = failed_count + 1 WHERE id = ?`, [log.campaign_id]);
                                console.log(`📉 Campaign ${log.campaign_id}: Failed count +1`);
                            }
                        }
                    } else {
                        console.log(`ℹ️ Status for Log ${log.id} is already ${oldStatus}. No update needed.`);
                    }

                    // 📡 REAL-TIME CHAT STATUS UPDATE (Moved to final block)
                } 
            } catch (dbErr) {
                console.error('❌ Failed to update RCS DLR in DB:', dbErr.message);
            }
        }

        // 4. Final Real-time Emission (Work for both Status Update & New Received Message)
        if (finalStatus === 'received' && messageContent && req.io && userId) {
            req.io.to(`user_${userId}`).emit('new_message', {
                id: messageId,
                sender: cleanSender,
                recipient: cleanRecipient || 'System',
                message_content: messageContent,
                created_at: new Date(),
                status: 'received',
                type: 'rcs'
            });
            console.log(`📡 Emitted RCS new_message to user_${userId} for ${cleanSender}`);

            // 🤖 CHECK CHATFLOWS — auto-reply if keyword matched
            if (typeof triggerChatflow === 'function') {
                triggerChatflow(userId, cleanSender, messageContent, 'rcs', req.io).catch(e =>
                    console.error('[ChatFlow] RCS trigger error:', e.message)
                );
            }

            // 🤖 CHECK AUTOMATIONS — graph-based logic
            if (typeof processAutomation === 'function') {
                processAutomation(userId, 'new_message', 'rcs', {
                    sender: cleanSender,
                    message_content: messageContent,
                    messageId: messageId,
                    metadata: decodedData
                }, req.io).catch(e => console.error('[AutomationService] RCS trigger error:', e.message));
            }
        }

        res.status(200).json({ success: true, message: 'Dotgo webhook processed' });
    } catch (error) {
        console.error('❌ Dotgo Webhook Error:', error.message);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

// GET /api/webhooks/message-logs (Optimized for 1Cr+ Scale)
router.get('/message-logs', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const limit = parseInt(req.query.limit) || 20;
        const lastId = parseInt(req.query.lastId) || 0; // Keyset pagination for 1Cr+ data
        const source = req.query.source || 'manual'; 

        let logsTable = (source === 'api') ? 'api_message_logs' : 'message_logs';
        let campaignsTable = (source === 'api') ? 'api_campaigns' : 'campaigns';

        let userIdQuery = req.query.userId || userId;
        let conditions = [];
        let params = [];

        if (req.user.role !== 'admin' && req.user.role !== 'superadmin' || userIdQuery !== 'all') {
            conditions.push("ml.user_id = ?");
            params.push(userIdQuery);
        }

        // Apply Keyset Pagination (FASTEST for 1Cr) or Page-based (Current UI)
        const page = parseInt(req.query.page) || 1;
        const offset = (page - 1) * limit;

        if (lastId > 0) {
            conditions.push("ml.id < ?");
            params.push(lastId);
        }

        if (req.query.campaignId) {
            conditions.push("ml.campaign_id = ?");
            params.push(req.query.campaignId);
        }

        if (req.query.search) {
            conditions.push("(ml.recipient LIKE ? OR ml.campaign_name LIKE ?)");
            params.push(`%${req.query.search}%`, `%${req.query.search}%`);
        }

        const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

        // Get total count for pagination (Admin/Small views only)
        const [countResult] = await query(`SELECT COUNT(*) as total FROM ${logsTable} ml ${whereClause}`, params);
        const total = countResult[0].total;

        const isExport = req.query.export === 'true';
        let selectSql = `
            SELECT ml.id, ml.user_id, ml.campaign_id, ml.campaign_name, ml.message_id, ml.recipient, ml.status, ml.message_content, ml.send_time, ml.delivery_time, ml.read_time, ml.template_name, ml.failure_reason, ml.created_at, ml.updated_at, c.channel as campaign_channel 
            FROM ${logsTable} ml 
            LEFT JOIN ${campaignsTable} c ON ml.campaign_id = c.id 
            ${whereClause} 
            ORDER BY ml.id DESC 
        `;

        let rows;
        if (isExport) {
            [rows] = await query(selectSql, params);
        } else {
            selectSql += ` LIMIT ? OFFSET ?`;
            [rows] = await query(selectSql, [...params, limit, offset]);
        }

        res.json({
            success: true,
            data: rows,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            },
            hasMore: rows.length === limit,
            nextLastId: rows.length > 0 ? rows[rows.length - 1].id : null
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

                            // Update logic based on messageId (checks both manual and API logs)
                            try {
                                let [logs] = [];
                                let isApiLog = false;
                                let attempts = 0;
                                while (attempts < 10) {
                                    [logs] = await query('SELECT * FROM message_logs WHERE message_id = ?', [messageId]);
                                    if (logs.length === 0) {
                                        [logs] = await query('SELECT * FROM api_message_logs WHERE message_id = ?', [messageId]);
                                        if (logs.length > 0) {
                                            isApiLog = true;
                                            break;
                                        }
                                    } else {
                                        break;
                                    }
                                    
                                    attempts++;
                                    // Wait 500ms before retrying (5 seconds total)
                                    if (attempts < 10) await new Promise(resolve => setTimeout(resolve, 500));
                                }

                                    if (logs.length > 0) {
                                        const log = logs[0];
                                        const finalStatus = (status || '').toLowerCase();
                                        const logsTable = isApiLog ? 'api_message_logs' : 'message_logs';
                                        const campaignsTable = isApiLog ? 'api_campaigns' : 'campaigns';

                                        // Status hierarchy to prevent downgrades (sent < delivered < read)
                                        const weights = { sent: 1, delivered: 2, read: 3, failed: 0 };
                                        const oldStatus = (log.status || 'sent').toLowerCase();

                                        if ((weights[finalStatus] || 0) > (weights[oldStatus] || 0)) {
                                            // 1. UPDATE DB LOG STATUS
                                            await query(`UPDATE ${logsTable} SET status = ?, updated_at = NOW() WHERE message_id = ?`, [finalStatus, messageId]);

                                            // 2. INCREMENT CAMPAIGN COUNTERS ATOMICALLY
                                            if (log.campaign_id) {
                                                if (finalStatus === 'delivered' && oldStatus !== 'delivered' && oldStatus !== 'read') {
                                                    await query(`UPDATE ${campaignsTable} SET delivered_count = delivered_count + 1 WHERE id = ?`, [log.campaign_id]);
                                                    await query(`UPDATE ${logsTable} SET delivery_time = NOW() WHERE message_id = ?`, [messageId]);
                                                } 
                                                else if (finalStatus === 'read' && oldStatus !== 'read') {
                                                    // If directly moved from sent to read, increment both
                                                    if (oldStatus !== 'delivered') {
                                                        await query(`UPDATE ${campaignsTable} SET delivered_count = delivered_count + 1, read_count = read_count + 1 WHERE id = ?`, [log.campaign_id]);
                                                    } else {
                                                        await query(`UPDATE ${campaignsTable} SET read_count = read_count + 1 WHERE id = ?`, [log.campaign_id]);
                                                    }
                                                    await query(`UPDATE ${logsTable} SET read_time = NOW(), delivery_time = COALESCE(delivery_time, NOW()) WHERE message_id = ?`, [messageId]);
                                                } 
                                                else if (finalStatus === 'failed' && oldStatus !== 'failed') {
                                                    await query(`UPDATE ${campaignsTable} SET failed_count = failed_count + 1 WHERE id = ?`, [log.campaign_id]);
                                                    await query(`UPDATE ${logsTable} SET failure_reason = ? WHERE message_id = ?`, [errorReason, messageId]);
                                                }
                                            }
                                        }
                                    // 📡 REAL-TIME CHAT STATUS UPDATE (Manual only)
                                    if (['delivered', 'read', 'failed'].includes(finalStatus) && req.io && !log.campaign_id) {
                                        req.io.to(`user_${log.user_id}`).emit('message_status_update', {
                                            message_id: messageId,
                                            status: finalStatus
                                        });
                                    }
                                } else {
                                    console.warn(`⚠️ WA Message ID ${messageId} not found in logs after retries.`);
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

                            let buttonId = null;
                            let listId = null;

                            if (msg.type === 'text') {
                                text = msg.text.body;
                            } else if (msg.type === 'button') {
                                text = msg.button.text;
                                buttonId = msg.button.payload; // Optional: Some vendors use payload
                            } else if (msg.type === 'interactive') {
                                if (msg.interactive.type === 'button_reply') {
                                    text = msg.interactive.button_reply.title;
                                    buttonId = msg.interactive.button_reply.id;
                                } else if (msg.interactive.type === 'list_reply') {
                                    text = msg.interactive.list_reply.title;
                                    listId = msg.interactive.list_reply.id;
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
                                    const cleanSender = String(sender).slice(-10); // Match last 10 digits
                                    const [lastChat] = await query(
                                        `SELECT user_id FROM message_logs 
                                         WHERE recipient LIKE ? 
                                         AND user_id IN (SELECT id FROM users WHERE whatsapp_config_id = (SELECT id FROM whatsapp_configs WHERE ph_no_id = ? LIMIT 1))
                                         ORDER BY created_at DESC LIMIT 1`,
                                        [`%${cleanSender}`, phoneId]
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
                                        buttonId,
                                        listId,
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

// ==========================================
// SMS WEBHOOKS (DLR)
// ==========================================

// GET or POST /api/webhooks/sms/callback
// SMS Delivery Reports (DLR) from various gateways
const handleSmsCallback = async (req, res) => {
    try {
        let payload = { ...req.query, ...req.body };

        // Handle case where query params are encoded into the path (e.g. callback%3Fmsgid=...)
        if (req.originalUrl.includes('%3F')) {
            const fullUrl = decodeURIComponent(req.originalUrl);
            if (fullUrl.includes('?')) {
                const queryString = fullUrl.split('?')[1];
                const params = new URLSearchParams(queryString);
                for (const [key, value] of params) {
                    payload[key] = value;
                }
            }
        }

        console.log('==============================================');
        console.log('📨 RECEIVED SMS WEBHOOK');
        console.log('Timestamp:', new Date().toISOString());
        console.log('Method:', req.method);
        console.log('URL:', req.originalUrl);
        console.log('Payload:', JSON.stringify(payload, null, 2));
        console.log('==============================================');

        // Common SMS gateway DLR parameters lookup:
        // Job ID / Msg ID: 'jobid', 'msgid', 'id', 'mid', 'fid', 'externalid', 'msg_id'
        const messageId = payload.jobid || payload.msgid || payload.id || payload.mid || payload.fid || payload.externalid || payload.msg_id;
        
        // Status: 'status', 'dlr_status', 'state', 'stat', 'err', 'delivery_status', 'status_id'
        const status = payload.status || payload.dlr_status || payload.state || payload.stat || payload.err || payload.delivery_status || payload.status_id;
        
        // Mobile: 'mobile', 'msisdn', 'to', 'dest', 'phoneno', 'phone'
        const mobile = payload.mobile || payload.msisdn || payload.to || payload.dest || payload.phoneno || payload.phone;

        let finalStatus = 'sent';
        const s = String(status || '').toLowerCase();
        
        // Smart SMS status parsing
        // If the string contains explicit SMPP 'stat:', parse it first
        let parsedStat = '';
        if (s.includes('stat:')) {
            const statMatch = s.match(/stat:([a-zA-Z]+)/);
            if (statMatch) parsedStat = statMatch[1].toLowerCase();
        }

        if (parsedStat.includes('reject') || parsedStat.includes('undeliv') || parsedStat.includes('fail')) {
            finalStatus = 'failed';
        } else if (parsedStat.includes('deliv')) {
            finalStatus = 'delivered';
        } else {
            // Fallback for general status strings or numeric codes
            // Prioritize checking for failures first
            if (s.includes('reject') || s.includes('undeliv') || s.includes('error') || s.includes('fail') || s === '16' || s === '2' || s === 'failed') {
                finalStatus = 'failed';
            } else if (s.includes('delivrd') || s.includes('delivered') || s.includes('success') || s === '0' || s === '1' || s === 'sent' || s.includes('dlvrd:001') || (s.includes('dlvrd') && !s.includes('dlvrd:000'))) {
                finalStatus = 'delivered';
            } else if (s.includes('submit') || s === '8' || s === '4' || s === 'submitted' || s === 'buffered') {
                finalStatus = 'sent';
            }
        }

        console.log(`📊 SMS DLR: Msg ${messageId || 'N/A'} for ${mobile || 'N/A'} is ${finalStatus} (Raw: ${status})`);

        // 1. SAVE TO WEBHOOK_LOGS (For Display on Panel)
        let userId = null;
        try {
            // Try to find the user_id associated with this message (Check both Manual and API logs)
            if (messageId && messageId !== 'N/A') {
                const [rows] = await query('SELECT user_id FROM message_logs WHERE message_id = ? LIMIT 1', [messageId]);
                if (rows && rows.length > 0) {
                    userId = rows[0].user_id;
                } else {
                    const [apiRows] = await query('SELECT user_id FROM api_message_logs WHERE message_id = ? LIMIT 1', [messageId]);
                    if (apiRows && apiRows.length > 0) userId = apiRows[0].user_id;
                }
            }

            await query(
                `INSERT INTO webhook_logs 
                (user_id, sender, recipient, message_id, status, type, raw_payload, created_at) 
                VALUES (?, ?, ?, ?, ?, 'sms', ?, NOW())`,
                [
                    userId || null, 
                    'Gateway', 
                    (mobile || 'N/A').replace(/\D/g, ''), // Clean mobile number 
                    messageId || 'N/A', 
                    finalStatus, 
                    JSON.stringify(payload)
                ]
            );
            console.log(`✅ Saved SMS webhook to webhook_logs table.`);
        } catch (logErr) {
            console.error('❌ Failed to save SMS webhook log:', logErr.message);
        }

        // 2. UPDATE LOGS & CAMPAIGN COUNTS (Manual or API)
        if (messageId || mobile) {
            try {
                let log = null;
                let isApiTable = false;

                // A. Try message_logs (Manual)
                if (messageId && messageId !== 'N/A') {
                    const [rows] = await query('SELECT * FROM message_logs WHERE message_id = ? ORDER BY id DESC LIMIT 1', [messageId]);
                    if (rows.length > 0) log = rows[0];
                }
                
                // B. Try api_message_logs if not found (API)
                if (!log && messageId && messageId !== 'N/A') {
                    const [rows] = await query('SELECT * FROM api_message_logs WHERE message_id = ? ORDER BY id DESC LIMIT 1', [messageId]);
                    if (rows.length > 0) { log = rows[0]; isApiTable = true; }
                }

                // C. Fallback: Search by mobile number (Last 72 hours)
                if (!log && mobile) {
                    const last10 = String(mobile).slice(-10);
                    // Match manual log
                    const [rows] = await query(
                        'SELECT * FROM message_logs WHERE (recipient LIKE ?) AND status = "sent" AND channel = "SMS" AND created_at > DATE_SUB(NOW(), INTERVAL 72 HOUR) ORDER BY id DESC LIMIT 1',
                        [`%${last10}`]
                    );
                    if (rows.length > 0) log = rows[0];

                    // Match api log if manual still not found
                    if (!log) {
                        const [apiRows] = await query(
                            'SELECT * FROM api_message_logs WHERE (recipient LIKE ?) AND status = "sent" AND channel = "SMS" AND created_at > DATE_SUB(NOW(), INTERVAL 72 HOUR) ORDER BY id DESC LIMIT 1',
                            [`%${last10}`]
                        );
                        if (apiRows.length > 0) { log = apiRows[0]; isApiTable = true; }
                    }
                }

                if (log) {
                    const currentTable = isApiTable ? 'api_message_logs' : 'message_logs';
                    const campaignsTable = isApiTable ? 'api_campaigns' : 'campaigns';

                    // Avoid status downgrade (don't go from delivered to sent)
                    const statusWeights = { 'sent': 1, 'delivered': 2, 'failed': -1 };
                    const currentWeight = statusWeights[log.status] || 0;
                    const newWeight = statusWeights[finalStatus] || 0;

                    if (newWeight !== 0 && (newWeight > currentWeight || finalStatus === 'failed')) {
                        console.log(`📝 Updating SMS Log ${log.id} (${log.recipient}) in ${currentTable}: ${log.status} -> ${finalStatus}`);
                        
                        await query(
                            `UPDATE ${currentTable} SET status = ?, message_id = COALESCE(?, message_id), updated_at = NOW() WHERE id = ?`, 
                            [finalStatus, messageId, log.id]
                        );
                        
                        // Handle Timestamps & Counters
                        if (finalStatus === 'delivered') {
                            await query(`UPDATE ${currentTable} SET delivery_time = NOW() WHERE id = ?`, [log.id]);
                            if (log.campaign_id) {
                                await query(`UPDATE ${campaignsTable} SET delivered_count = delivered_count + 1 WHERE id = ?`, [log.campaign_id]);
                            }
                        } else if (finalStatus === 'failed') {
                            // Smart Extraction: Extract actual error details instead of generic message
                            let reason = payload.reason || payload.err_code || payload.description || payload.err || payload.errorCode || payload.error_msg || payload.err_desc;
                            
                            // If it's an SMPP style status string (e.g. "id:msg1 sub:001 dlvrd:000 err:001 stat:REJECTED")
                            if (!reason && s.includes('err:')) {
                                const errMatch = s.match(/err:([a-zA-Z0-9]+)/i);
                                const statMatch = s.match(/stat:([a-zA-Z0-9]+)/i);
                                
                                if (errMatch && statMatch) reason = `${statMatch[1]} (Error: ${errMatch[1]})`;
                                else if (errMatch) reason = `Gateway Error: ${errMatch[1]}`;
                                else if (statMatch) reason = `Status: ${statMatch[1]}`;
                            }
                            
                            // Final Fallback: If still no reason, use the raw status string itself if it's short and useful
                            if (!reason || reason === 'Gateway reported failure') {
                                reason = (s.length > 0 && s.length < 50) ? s.toUpperCase() : 'REJECTED';
                            }

                            await query(`UPDATE ${currentTable} SET failure_reason = ? WHERE id = ?`, [reason, log.id]);
                            if (log.campaign_id) {
                                await query(`UPDATE ${campaignsTable} SET failed_count = failed_count + 1 WHERE id = ?`, [log.campaign_id]);
                            }
                        }

                        // Emit socket status update if user is active (Manual only)
                        if (req.io && (userId || log.user_id) && !log.campaign_id) {
                            req.io.to(`user_${userId || log.user_id}`).emit('message_status_update', {
                                message_id: messageId || log.message_id,
                                status: finalStatus
                            });
                        }
                    } else {
                        console.log(`ℹ️ SMS Log ${log.id} status update ignored (Weights: Current ${currentWeight}, New ${newWeight})`);
                    }
                } else {
                    console.warn(`⚠️ No matching SMS log found for callback: ID=${messageId}, Mobile=${mobile}`);
                }
            } catch (dbErr) {
                console.error('❌ Failed to update SMS DLR in DB:', dbErr.message);
            }
        }

        res.status(200).send("OK");
    } catch (error) {
        console.error('❌ Global SMS Callback Error:', error.message);
        res.status(200).send("ERROR");
    }
};

router.get('/sms/callback', handleSmsCallback);
router.post('/sms/callback', handleSmsCallback);

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


