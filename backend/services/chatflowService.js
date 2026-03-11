/**
 * ChatFlow Auto-Reply Service
 * 
 * When an incoming message is received via webhook (WhatsApp/RCS),
 * this service checks if any active chatflow keyword matches the message text.
 * If a match is found, it automatically sends a reply back to the sender.
 */

const { query } = require('../config/db');
const { sendRcsMessage } = require('./rcsService');
const axios = require('axios');
const PINBOT_BASE = 'https://partnersv1.pinbot.ai/v3';
const GRAPH_BASE = 'https://graph.facebook.com/v19.0';

/**
 * Checks incoming message against active chatflows and sends auto-reply if matched.
 * @param {number} userId - The user whose chatflows to check
 * @param {string} senderPhone - The phone number of the sender
 * @param {string} messageText - The incoming message text
 * @param {string} channel - 'whatsapp' | 'rcs'
 * @param {object} io - Socket.io instance for real-time notification
 * @param {object} channelMeta - Extra channel config (phoneId for WA, etc.)
 * @returns {boolean} - true if a chatflow was triggered
 */
async function triggerChatflow(userId, senderPhone, messageText, channel, io, channelMeta = {}) {
    if (!userId || !senderPhone || !messageText) return false;

    try {
        // 1. Fetch all active flows for this user
        const [flows] = await query(
            "SELECT * FROM chat_flows WHERE user_id = ? AND status = 'active'",
            [userId]
        );

        if (!flows || flows.length === 0) return false;

        const incomingLower = messageText.trim().toLowerCase();

        // 2. Find a matching flow by keyword
        let matchedFlow = null;
        for (const flow of flows) {
            let keywords = [];
            try {
                keywords = typeof flow.keywords === 'string' ? JSON.parse(flow.keywords) : (flow.keywords || []);
            } catch (e) { keywords = []; }

            const matched = keywords.some(kw =>
                incomingLower.includes(kw.toLowerCase()) ||
                incomingLower === kw.toLowerCase()
            );

            if (matched) {
                matchedFlow = flow;
                break;
            }
        }

        if (!matchedFlow) return false;

        const replyText = matchedFlow.body || '';
        if (!replyText) return false;

        console.log(`🤖 [ChatFlow] Matched flow "${matchedFlow.name}" for keyword in: "${messageText}"`);

        // 3. Send auto-reply based on channel
        let sendSuccess = false;
        let sendError = '';

        if (channel === 'whatsapp') {
            sendSuccess = await sendWhatsAppAutoReply(userId, senderPhone, replyText, channelMeta);
        } else if (channel === 'rcs') {
            sendSuccess = await sendRcsAutoReply(userId, senderPhone, replyText);
        }

        // 4. Save auto-reply to webhook_logs as an outgoing message
        try {
            const [result] = await query(
                'INSERT INTO webhook_logs (user_id, sender, recipient, message_content, status, type) VALUES (?, ?, ?, ?, ?, ?)',
                [userId, 'System', senderPhone, replyText, sendSuccess ? 'sent' : 'failed', channel]
            );

            // 5. Increment triggers count for this flow
            await query('UPDATE chat_flows SET triggers = COALESCE(triggers, 0) + 1 WHERE id = ?', [matchedFlow.id]);

            // 6. Real-time notification via Socket.io
            if (io && userId) {
                io.to(`user_${userId}`).emit('new_message', {
                    id: result.insertId,
                    sender: 'System',
                    recipient: senderPhone,
                    message_content: replyText,
                    created_at: new Date(),
                    status: sendSuccess ? 'sent' : 'failed',
                    type: channel
                });
            }
        } catch (dbErr) {
            console.error('[ChatFlow] Failed to log auto-reply:', dbErr.message);
        }

        console.log(`✅ [ChatFlow] Auto-reply ${sendSuccess ? 'sent' : 'failed'} to ${senderPhone}`);
        return sendSuccess;

    } catch (err) {
        console.error('[ChatFlow] triggerChatflow error:', err.message);
        return false;
    }
}

/**
 * Send auto-reply via WhatsApp
 */
async function sendWhatsAppAutoReply(userId, to, text, meta = {}) {
    try {
        // Get user's WhatsApp config
        const [configs] = await query(
            'SELECT wc.* FROM users u JOIN whatsapp_configs wc ON u.whatsapp_config_id = wc.id WHERE u.id = ?',
            [userId]
        );

        if (!configs || configs.length === 0) {
            console.warn('[ChatFlow] No WhatsApp config for user:', userId);
            return false;
        }

        const cfg = configs[0];
        const isPinbot = cfg.provider === 'vendor2';
        const mobile = to.replace(/\D/g, '');

        let msgUrl, headers, payload;

        if (isPinbot) {
            msgUrl = `${PINBOT_BASE}/${cfg.ph_no_id}/messages`;
            headers = { apikey: cfg.api_key, 'Content-Type': 'application/json' };
        } else {
            msgUrl = `${GRAPH_BASE}/${cfg.ph_no_id}/messages`;
            headers = { Authorization: `Bearer ${cfg.wa_token}`, 'Content-Type': 'application/json' };
        }

        payload = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: mobile,
            type: 'text',
            text: { body: text }
        };

        const response = await axios.post(msgUrl, payload, { headers });
        console.log(`✅ [ChatFlow] WA auto-reply sent to ${mobile}`);
        return true;
    } catch (err) {
        console.error('[ChatFlow] WA send error:', err.response?.data?.error?.message || err.message);
        return false;
    }
}

/**
 * Send auto-reply via RCS
 */
async function sendRcsAutoReply(userId, to, text) {
    try {
        const [configs] = await query(
            'SELECT rc.* FROM users u JOIN rcs_configs rc ON u.rcs_config_id = rc.id WHERE u.id = ?',
            [userId]
        );

        if (!configs || configs.length === 0) {
            console.warn('[ChatFlow] No RCS config for user:', userId);
            return false;
        }

        const rcsConfig = configs[0];
        const result = await sendRcsMessage(to, text, rcsConfig);
        console.log(`✅ [ChatFlow] RCS auto-reply sent to ${to}`);
        return result.success === true;
    } catch (err) {
        console.error('[ChatFlow] RCS send error:', err.message);
        return false;
    }
}

/**
 * Ensure the chat_flows table exists with all required columns
 */
async function ensureChatFlowsTable() {
    try {
        await query(`
            CREATE TABLE IF NOT EXISTS chat_flows (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                name VARCHAR(255) NOT NULL,
                category VARCHAR(100) DEFAULT 'General',
                keywords JSON,
                header_type VARCHAR(50),
                header_value TEXT,
                body TEXT,
                track_url VARCHAR(500),
                api_config JSON,
                footer_config JSON,
                logic_config JSON,
                status ENUM('active', 'paused', 'draft') DEFAULT 'active',
                triggers INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        console.log('✅ [ChatFlow] chat_flows table ready');
    } catch (err) {
        console.error('❌ [ChatFlow] Failed to ensure table:', err.message);
    }
}

module.exports = { triggerChatflow, ensureChatFlowsTable };
