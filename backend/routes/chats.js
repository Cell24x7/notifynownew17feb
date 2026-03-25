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

        // Optimized for Standard MySQL compatibility (removed ANY_VALUE for older versions)
        const sql = `
            SELECT 
                contact_phone,
                MAX(created_at) as last_message_time,
                MAX(message_content) as last_message,
                MAX(status) as status,
                MAX(type) as channel,
                contact_phone as name
            FROM (
                SELECT 
                    CASE 
                        WHEN sender IN ('System', 'Gateway', 'API', 'chatbot', 'System User') THEN recipient
                        WHEN recipient IN ('System', 'Gateway', 'API', 'chatbot', 'System User') THEN sender
                        ELSE sender 
                    END as contact_phone,
                    created_at,
                    message_content,
                    status,
                    type
                FROM webhook_logs 
                WHERE user_id = ? 
                ORDER BY created_at DESC 
                LIMIT 1000
            ) as recent_logs
            WHERE contact_phone IS NOT NULL AND contact_phone != 'System'
            GROUP BY contact_phone 
            ORDER BY last_message_time DESC 
            LIMIT 50
        `;

        console.log(`🔍 Fetching fixed smart-optimized conversations for user: ${userId}`);
        const [conversations] = await query(sql, [userId]);
        
        console.log(`✅ Loaded ${conversations.length} distinct chats.`);
        res.json({ success: true, data: conversations });
    } catch (error) {
        console.error('❌ Error fetching conversations:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
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
            SELECT * FROM (
                SELECT * FROM webhook_logs 
                WHERE user_id = ? AND (
                    REPLACE(REPLACE(sender, '+', ''), ' ', '') = ? OR 
                    REPLACE(REPLACE(recipient, '+', ''), ' ', '') = ? OR
                    sender = ? OR recipient = ?
                )
                ORDER BY created_at DESC
                LIMIT 100
            ) as recent_msgs
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
        await query(
            'INSERT INTO message_logs (user_id, recipient, channel, status, message_id, message_content, campaign_id, campaign_name, created_at, send_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
            [userId, cleanRecipient, channelType.toUpperCase(), finalStatus, providerMessageId, message, manualCampaignId, 'Manual Chat']
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
