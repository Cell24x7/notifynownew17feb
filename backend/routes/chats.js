const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const authenticateToken = require('../middleware/authMiddleware');

/**
 * @route GET /api/chats/conversations
 * @desc Get list of unique conversations for the logged in user
 */
router.get('/conversations', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

    const sql = `
            SELECT 
                t.contact_phone,
                t.last_message_time,
                t.message_content as last_message,
                t.status,
                t.type as channel,
                COALESCE(c.name, t.contact_phone) as name
            FROM (
                SELECT 
                    CASE 
                        WHEN sender REGEXP '^[0-9]+$' THEN sender
                        ELSE recipient 
                    END as contact_phone,
                    created_at as last_message_time,
                    message_content,
                    status,
                    type,
                    ROW_NUMBER() OVER(
                        PARTITION BY CASE 
                            WHEN sender REGEXP '^[0-9]+$' THEN sender
                            ELSE recipient 
                        END 
                        ORDER BY created_at DESC
                    ) as rn
                FROM webhook_logs
                WHERE user_id = ?
            ) as t
            LEFT JOIN contacts c 
                ON (c.phone = t.contact_phone OR c.phone = CONCAT('+', t.contact_phone) OR CONCAT('+', c.phone) = t.contact_phone)
                AND c.user_id = ?
            WHERE t.rn = 1
            ORDER BY t.last_message_time DESC
        `;

        console.log(`🔍 Fetching conversations for user: ${userId}`);
        const [conversations] = await query(sql, [userId, userId]);
        console.log(`✅ Found ${conversations.length} conversations`);
        res.json({ success: true, data: conversations });
    } catch (error) {
        console.error('❌ Error fetching conversations:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
    }
});

/**
 * @route GET /api/chats/messages/:phone
 * @desc Get chat history for a specific contact
 */
router.get('/messages/:phone', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const phone = req.params.phone;

        const cleanPhone = phone.replace(/\D/g, '');
        const sql = `
            SELECT * FROM webhook_logs 
            WHERE user_id = ? AND (
                REPLACE(sender, '+', '') = ? OR 
                REPLACE(recipient, '+', '') = ? OR
                sender = ? OR recipient = ?
            )
            ORDER BY created_at ASC
        `;

        const [messages] = await query(sql, [userId, cleanPhone, cleanPhone, phone, phone]);
        res.json({ success: true, data: messages });
    } catch (error) {
        console.error('Error fetching messages:', error.message);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

/**
 * @route GET /api/chats/quick-replies
 * @desc Get real quick replies for the user
 */
router.get('/quick-replies', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const [replies] = await query('SELECT * FROM quick_replies WHERE user_id = ?', [userId]);
        res.json({ success: true, data: replies });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch quick replies' });
    }
});

/**
 * @route GET /api/chats/templates
 * @desc Get real message templates for the user
 */
router.get('/templates', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const [templates] = await query('SELECT * FROM message_templates WHERE user_id = ?', [userId]);
        res.json({ success: true, data: templates });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch templates' });
    }
});

/**
 * @route POST /api/chats/send
 * @desc Send a message to a contact
 */
router.post('/send', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { recipient, message, channel } = req.body;
        const authHeader = req.headers.authorization;

        if (!recipient || !message || !channel) {
            return res.status(400).json({ success: false, message: 'Missing fields' });
        }

        const cleanRecipient = recipient.replace(/\D/g, '');
        const channelType = channel.toLowerCase();
        let apiDispatchSuccess = false;
        let providerMessageId = null;
        let errorMessage = '';

        try {
            if (channelType === 'whatsapp') {
                const axios = require('axios');
                const port = process.env.PORT || 5000;
                
                const response = await axios.post(`http://localhost:${port}/api/whatsapp/send`, {
                    to: recipient,
                    type: 'text',
                    text: { body: message }
                }, {
                    headers: { 'Authorization': authHeader }
                });

                if (response.data && response.data.success) {
                    apiDispatchSuccess = true;
                    providerMessageId = response.data.data?.messages?.[0]?.id || response.data.data?.id; // Standard Meta/Pinbot ID
                } else {
                    errorMessage = response.data?.message || 'WhatsApp sending failed';
                }
            } else if (channelType === 'rcs') {
                const { sendRcsMessage } = require('../services/rcsService');
                
                const [configs] = await query(`
                  SELECT rc.* 
                  FROM users u 
                  JOIN rcs_configs rc ON u.rcs_config_id = rc.id 
                  WHERE u.id = ?
                `, [userId]);

                if (!configs || configs.length === 0) {
                    errorMessage = 'No RCS configuration assigned';
                } else {
                    const rcsConfig = configs[0];
                    const rcsResult = await sendRcsMessage(recipient, message, rcsConfig);
                    
                    if (rcsResult.success) {
                        apiDispatchSuccess = true;
                        providerMessageId = rcsResult.messageId;
                    } else {
                        errorMessage = rcsResult.error || 'RCS sending failed';
                    }
                }
            } else if (channelType === 'sms') {
                errorMessage = 'Live SMS sending is currently under construction';
            } else {
                errorMessage = 'Unsupported channel';
            }
        } catch (apiError) {
            console.error(`Dispatch error for ${channelType}:`, apiError.message);
            errorMessage = apiError.response?.data?.message || apiError.message || 'Dispatch failed';
        }

        const finalStatus = apiDispatchSuccess ? 'sent' : 'failed';
        const manualCampaignId = `CAMP_MANUAL_${Date.now()}`;

        // Save to webhook_logs as an OUTGOING message (including providerMessageId for DLR matching)
        const [result] = await query(
            'INSERT INTO webhook_logs (user_id, sender, recipient, message_content, status, type, message_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [userId, 'System', cleanRecipient, message, finalStatus, channelType, providerMessageId]
        );

        // ALSO Save to message_logs so it shows in Detailed Reports
        const logId = `LOG_CHAT_${Date.now()}`;
        await query(
            'INSERT INTO message_logs (id, user_id, recipient, channel, status, message_id, message_content, campaign_id, campaign_name, created_at, send_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
            [logId, userId, cleanRecipient, channelType.toUpperCase(), finalStatus, providerMessageId, message, manualCampaignId, 'Manual Chat']
        ).catch(err => console.error('❌ Error logging manual chat to message_logs:', err.message));

        if (req.io) {
            req.io.to(`user_${userId}`).emit('new_message', {
                id: result.insertId,
                sender: 'System',
                recipient: cleanRecipient,
                message_content: message,
                status: finalStatus,
                channel: channelType,
                created_at: new Date()
            });
        }

        if (apiDispatchSuccess) {
            res.json({ success: true, message: 'Message sent successfully' });
        } else {
            res.status(500).json({ success: false, message: `Failed to send via provider: ${errorMessage}` });
        }
    } catch (error) {
        console.error('Error sending message:', error.message);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

module.exports = router;
