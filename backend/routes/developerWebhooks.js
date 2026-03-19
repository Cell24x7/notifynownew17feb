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
        const targetUserId = 1; 

        // 2. Format the phone number
        let phone = customerDetail.phoneNumber.toString();

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
        
        const templateName = 'waterpark_booking_co'; 
        const langCode = 'en_US'; 

        // 4. Fetch the message template details
        const [templates] = await query(
            'SELECT body, metadata FROM message_templates WHERE name = ? AND user_id = ? LIMIT 1',
            [templateName, targetUserId]
        );

        if (!templates.length) {
            console.error('Template not found:', templateName);
            return res.status(404).json({ success: false, error: 'Template not found' });
        }

        const template = templates[0];
        const itemsSummary = (items || []).map(i => `${i.ItemName}x${i.Quantity}`).join(', ');

        // Create a mapping of payload fields to variables
        const resolvedVars = {
            '1': customerDetail.firstName || 'Customer',
            '2': String(orderNumber || ''),
            '3': itemsSummary.substring(0, 1024),
            '4': String(summary?.total || 0),
            'header_url': '' // Will be updated if PDF exists
        };

        // 5. Structure the Template Payload
        let waPayload = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: phone,
            type: 'template',
            template: {
                name: templateName,
                language: { code: langCode },
                components: []
            }
        };

        const payloadComponents = [];
        const templateMeta = typeof template.metadata === 'string' ? JSON.parse(template.metadata) : (template.metadata || {});
        const mtComponents = templateMeta.components || [];

        // Function to extract variables for WhatsApp parameters
        const getOrderedVariables = (text, vars) => {
            if (!text) return [];
            const regex = /\{\{\s*([^}\s]+)\s*\}\}|\[\s*([^\]\s]+)\s*\]/g;
            const params = [];
            let match;
            while ((match = regex.exec(text)) !== null) {
                const varName = match[1] || match[2];
                params.push(vars[varName] || '');
            }
            return params;
        };

        // a) Handle Body Component
        const bodyComp = mtComponents.find(c => c.type === 'BODY' || c.type === 'body');
        const bodyText = bodyComp?.text || template.body || '';
        const bodyParams = getOrderedVariables(bodyText, resolvedVars);
        if (bodyParams.length > 0) {
            payloadComponents.push({
                type: 'body',
                parameters: bodyParams.map(v => ({ type: 'text', text: String(v) }))
            });
        }

        // 6. Handle PDF Attachment (Header Component)
        let hasAttachment = payload.attachment && payload.attachment.length > 0 && payload.attachment[0].Base64Content;
        if (hasAttachment) {
            try {
                const pdfBuffer = Buffer.from(payload.attachment[0].Base64Content, 'base64');
                const fileLength = pdfBuffer.length;
                let rawName = payload.attachment[0].Name || 'Ticket';
                let sanitizedName = rawName.replace(/[^a-z0-9]/gi, '_').substring(0, 40); 
                const fileName = `${sanitizedName}.pdf`;

                console.log(`📎 Found attachment: ${fileName} (${fileLength} bytes). Uploading to ${config.provider}...`);

                if (config.provider === 'vendor2') { // PinBot
                    // Step 1: Create Upload Session
                    const sessionRes = await axios.post(`${PINBOT_BASE}/app/uploads`, {}, {
                        headers: { 
                            apikey: config.api_key,
                            'Content-Type': 'application/json'
                        },
                        params: { 
                            file_length: fileLength, 
                            file_type: 'application/pdf' 
                        }
                    });

                    const sessionId = sessionRes.data.id;
                    const sig = sessionRes.data.sig || '';
                    console.log(`📡 Upload session created ID: ${sessionId}`);

                    // Step 2: Upload File (using RAW binary as required by some API versions)
                    const uploadRes = await axios.post(`${PINBOT_BASE}/${sessionId}${sig ? `?sig=${sig}` : ''}`, pdfBuffer, {
                        headers: { 
                            apikey: config.api_key, 
                            'Content-Type': 'application/pdf'
                        }
                    });

                    const pdfHandle = uploadRes.data.h; 
                    console.log(`✅ PDF Uploaded, Handle: ${pdfHandle}`);
                    
                    if (pdfHandle) {
                        payloadComponents.unshift({
                            type: "header",
                            parameters: [{
                                type: "document",
                                document: {
                                    file_name: fileName,
                                    id: pdfHandle // Use 'id' for uploaded handles
                                }
                            }]
                        });
                    }
                }
            } catch (err) {
                console.error('❌ Failed to upload PDF attachment:', err.response?.data || err.message);
                // If template requires header, we might still fail later, but at least we logged it.
            }
        } else {
            // b) Handle Text Header if no media attachment provided
            const headerComp = mtComponents.find(c => c.type === 'HEADER' || c.type === 'header');
            if (headerComp && headerComp.format?.toUpperCase() === 'TEXT' && headerComp.text?.includes('{{')) {
                const headParams = getOrderedVariables(headerComp.text, resolvedVars);
                if (headParams.length > 0) {
                    payloadComponents.unshift({
                        type: 'header',
                        parameters: headParams.map(v => ({ type: 'text', text: String(v) }))
                    });
                }
            }
        }

        waPayload.template.components = payloadComponents;

        // 7. Send message using WhatsApp API
        let sendSuccess = false;
        try {
            console.log('📡 Sending dynamic WhatsApp payload:', JSON.stringify(waPayload, null, 2));
            if (config.provider === 'vendor2') {
                await axios.post(
                    `${PINBOT_BASE}/${config.ph_no_id}/messages`,
                    waPayload,
                    { headers: { apikey: config.api_key, 'Content-Type': 'application/json' } }
                );
            } else {
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

        // 8. Log the outgoing message in the database
        try {
            const apiCampaignId = `CAMP_API_DEV_${Date.now()}`;
            const apiCampaignName = 'Developer API Trigger';

            await query(
                'INSERT INTO webhook_logs (user_id, sender, recipient, message_content, status, type, campaign_id, campaign_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [targetUserId, config.wanumber || 'API', phone, JSON.stringify(waPayload), sendSuccess ? 'sent' : 'failed', 'whatsapp', apiCampaignId, apiCampaignName]
            );

            await query(
                'INSERT INTO message_logs (user_id, campaign_id, campaign_name, template_name, message_id, recipient, status, send_time) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
                [targetUserId, apiCampaignId, apiCampaignName, templateName, `WH_${Date.now()}`, phone, sendSuccess ? 'sent' : 'failed']
            );
        } catch (logErr) {
            console.error('❌ Error logging webhook message:', logErr.message);
        }

        res.json({ success: true, message: 'Data received and WhatsApp message triggered', whatsappSent: sendSuccess });

    } catch (err) {
        console.error('❌ Webhook error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
