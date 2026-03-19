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

        // 1. Target User ID (You can change this based on your logic, currently hardcoded for user 1)
        const targetUserId = 1; // This is the user ID for your specific developer integration

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
        // ALWAYS use a template for business-initiated messages
        const templateName = 'the_great_escape_ticket'; // Ensure this matches your approved template
        const langCode = 'en';

        // Map items into a summarized string
        const itemsSummary = items && items.length > 0 
            ? items.map(item => `${item.ItemName}x${item.Quantity}`).join(', ') 
            : 'Order items';

        // 5. Structure the Template Payload
        waPayload = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: phone,
            type: 'template',
            template: {
                name: templateName,
                language: { code: langCode },
                components: [
                    {
                        type: "body",
                        parameters: [
                            { type: "text", text: customerDetail.firstName || 'Customer' }, // {{1}}
                            { type: "text", text: String(orderNumber) },                  // {{2}}
                            { type: "text", text: itemsSummary.substring(0, 1024) },      // {{3}}
                            { type: "text", text: String(summary?.total || 0) }           // {{4}}
                        ]
                    }
                ]
            }
        };

        // 6. Add PDF attachment if available (in Header)
        let hasAttachment = payload.attachment && payload.attachment.length > 0 && payload.attachment[0].Base64Content;
        
        if (hasAttachment) {
            try {
                console.log(`📎 Found attachment, uploading for ${config.provider}...`);
                const pdfBuffer = Buffer.from(payload.attachment[0].Base64Content, 'base64');
                const fileLength = pdfBuffer.length;
                const fileName = `${payload.attachment[0].Name || 'Ticket'}.pdf`;

                if (config.provider === 'vendor2') { // PinBot
                    const sessionRes = await axios.post(`${PINBOT_BASE}/app/uploads`, null, {
                        headers: { apikey: config.api_key },
                        params: { file_length: fileLength, file_type: 'application/pdf' }
                    });
                    const sessionId = sessionRes.data.id;
                    const FormData = require('form-data');
                    const form = new FormData();
                    form.append('file', pdfBuffer, { filename: fileName, contentType: 'application/pdf' });
                    const uploadRes = await axios.post(`${PINBOT_BASE}/${sessionId}`, form, {
                        headers: { apikey: config.api_key, ...form.getHeaders() }
                    });
                    const pdfHandle = uploadRes.data.h; 
                    
                    waPayload.template.components.unshift({
                        type: "header",
                        parameters: [{
                            type: "document",
                            document: {
                                file_name: fileName,
                                link: `https://partnersv1.pinbot.ai/media/${pdfHandle}`
                            }
                        }]
                    });
                }
            } catch (err) {
                console.error('❌ Failed to upload PDF attachment:', err.response?.data || err.message);
                // Continue with template minus header if upload fails
            }
        }


        // 6. Send message using WhatsApp API
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

        // 7. Log the outgoing message in the database (For Chat/Incoming views and for Dashboard Reports)
        try {
            const apiCampaignId = `CAMP_API_DEV_${Date.now()}`;
            const apiCampaignName = 'Developer API Trigger';
            const templateName = waPayload.type === 'template' ? waPayload.template.name : 'Text Message';
            const msgContent = waPayload.type === 'template' ? `Template: ${waPayload.template.name}` : messageText;
            const finalStatus = sendSuccess ? 'sent' : 'failed';

            // Insert into webhook_logs (for chat interface)
            await query(
                'INSERT INTO webhook_logs (user_id, sender, recipient, message_content, status, type, campaign_id, campaign_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [targetUserId, 'API Bot', phone, msgContent, finalStatus, 'whatsapp', apiCampaignId, apiCampaignName]
            );

            // Insert into message_logs (for Dashboard API Logs reporting)
            await query(
                'INSERT INTO message_logs (user_id, campaign_id, campaign_name, template_name, message_id, recipient, status, send_time) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
                [targetUserId, apiCampaignId, apiCampaignName, templateName, `DEV_${Date.now()}`, phone, finalStatus]
            );
        } catch (dbErr) {
            console.error('Failed to log webhook message:', dbErr.message);
        }

        // 8. Send back success response to the developer who called the webhook
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
