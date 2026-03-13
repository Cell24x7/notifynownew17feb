const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const axios = require('axios');

const PINBOT_BASE = 'https://partnersv1.pinbot.ai/v3';

// ─────────────────────────────────────────────
// POST /webhook/data
// Specific webhook for developer integration
// ─────────────────────────────────────────────
router.post('/data', async (req, res) => {
    try {
        const payload = req.body;

        console.log('==============================================');
        console.log('📨 RECEIVED DEVELOPER WEBHOOK');
        console.log('Timestamp:', new Date().toISOString());
        console.log('Payload:', JSON.stringify(payload, null, 2));
        console.log('==============================================');

        const { customerDetail, orderNumber, items, summary } = payload;

        if (!customerDetail || !customerDetail.phoneNumber) {
            return res.status(400).json({ success: false, error: 'Missing customer phone number' });
        }

        // 1. Target User ID (You can change this based on your logic, currently hardcoded for user 34)
        const targetUserId = 34; // This is the user ID for your specific developer integration

        // 2. Format the phone number (Ensure it has country code)
        let phone = customerDetail.phoneNumber.toString();
        // If phone doesn't start with 91, maybe prepend it? Assuming it already comes with 91 as per your example.

        // 3. Fetch WhatsApp configuration for the user
        const [users] = await query('SELECT whatsapp_config_id FROM users WHERE id = ?', [targetUserId]);
        if (!users.length || !users[0].whatsapp_config_id) {
            console.error('WhatsApp not configured for user', targetUserId);
            return res.status(500).json({ success: false, error: 'User WhatsApp not configured' });
        }

        const [configs] = await query(
            "SELECT * FROM whatsapp_configs WHERE id = ? AND is_active = 1",
            [users[0].whatsapp_config_id]
        );

        if (!configs.length) {
            console.error('Active WhatsApp config not found for user', targetUserId);
            return res.status(500).json({ success: false, error: 'User active WhatsApp configuration not found' });
        }

        const config = configs[0];
        
        // 4. Prepare message dynamically based on payload
        // Example: Sending a simple text message greeting the customer with their order details
        let itemsList = items && items.length > 0 
            ? items.map(item => `- ${item.ItemName} (Qty: ${item.Quantity})`).join('\n') 
            : 'No items';

        let messageText = `Hi ${customerDetail.firstName || 'Customer'},\n\nWe have received your order #${orderNumber}.\n\nOrder Summary:\n${itemsList}\n\nTotal Paid: Rs. ${summary?.total || 0}\n\nThank you!`;

        let waPayload = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: phone,
            type: 'text',
            text: {
                preview_url: false,
                body: messageText
            }
        };

        // If you want to send a template instead, you can uncomment and modify this:
        /*
        waPayload = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: phone,
            type: 'template',
            template: {
                name: 'your_template_name_here',
                language: { code: 'en' },
                components: [
                    {
                        type: "body",
                        parameters: [
                            { type: "text", text: customerDetail.firstName },
                            { type: "text", text: String(orderNumber) }
                        ]
                    }
                ]
            }
        };
        */

        // 5. Send message using WhatsApp API
        let sendSuccess = false;
        
        try {
            if (config.provider === 'vendor2') {
                // Pinbot Provider
                await axios.post(
                    `${PINBOT_BASE}/${config.ph_no_id}/messages`,
                    waPayload,
                    { headers: { apikey: config.api_key, 'Content-Type': 'application/json' } }
                );
            } else {
                // Facebook Graph API Provider
                const GRAPH_BASE = 'https://graph.facebook.com/v19.0';
                await axios.post(
                    `${GRAPH_BASE}/${config.ph_no_id}/messages`,
                    waPayload,
                    { headers: { Authorization: `Bearer ${config.api_key}`, 'Content-Type': 'application/json' } }
                );
            }
            sendSuccess = true;
            console.log(`✅ WhatsApp message sent automatically to ${phone}`);
        } catch (sendErr) {
            console.error(`❌ Failed to send WhatsApp message to ${phone}:`, sendErr.response?.data || sendErr.message);
        }

        // 6. Log the outgoing message in the database
        try {
            await query(
                'INSERT INTO webhook_logs (user_id, sender, recipient, message_content, status, type) VALUES (?, ?, ?, ?, ?, ?)',
                [targetUserId, 'API Bot', phone, waPayload.type === 'template' ? `Template: ${waPayload.template.name}` : messageText, sendSuccess ? 'sent' : 'failed', 'whatsapp']
            );
        } catch (dbErr) {
            console.error('Failed to log webhook message:', dbErr.message);
        }

        // 7. Send back success response to the developer who called the webhook
        res.status(200).json({ 
            success: true, 
            message: 'Data received and WhatsApp message triggered', 
            whatsappSent: sendSuccess 
        });

    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

module.exports = router;
