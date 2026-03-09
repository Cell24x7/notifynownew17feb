/**
 * WhatsApp Routes — Universal (Meta Graph API + Pinbot/Pinnacle)
 * Automatically routes to correct API based on user's provider config
 */

const express = require('express');
const axios = require('axios');
const { query } = require('../config/db');
const authenticate = require('../middleware/authMiddleware');

const router = express.Router();

const PINBOT_BASE = 'https://partnersv1.pinbot.ai/v3';
const GRAPH_BASE = 'https://graph.facebook.com/v19.0';

/**
 * Helper: Get WhatsApp config + detect provider
 */
const getWhatsAppConfig = async (userId) => {
    const [users] = await query('SELECT whatsapp_config_id FROM users WHERE id = ?', [userId]);
    if (!users.length || !users[0].whatsapp_config_id) {
        throw new Error('WhatsApp not configured for this account');
    }

    const [configs] = await query('SELECT * FROM whatsapp_configs WHERE id = ? AND is_active = 1', [users[0].whatsapp_config_id]);
    if (!configs.length) {
        throw new Error('WhatsApp configuration not found or inactive');
    }

    const config = configs[0];
    config.isPinbot = config.provider === 'vendor2';
    return config;
};

/**
 * Helper: Build auth headers based on provider
 */
const getHeaders = (config) => {
    if (config.isPinbot) {
        return { apikey: config.api_key, 'Content-Type': 'application/json' };
    }
    return { Authorization: `Bearer ${config.wa_token}`, 'Content-Type': 'application/json' };
};

/**
 * Helper: Build base URL for templates
 */
const getTemplatesUrl = (config) => {
    if (config.isPinbot) return `${PINBOT_BASE}/${config.wa_biz_accnt_id}/message_templates`;
    return `${GRAPH_BASE}/${config.wa_biz_accnt_id}/message_templates`;
};

/**
 * Helper: Build base URL for messages
 */
const getMessagesUrl = (config) => {
    if (config.isPinbot) return `${PINBOT_BASE}/${config.ph_no_id}/messages`;
    return `${GRAPH_BASE}/${config.ph_no_id}/messages`;
};

// ─────────────────────────────────────────────
// TEMPLATES
// ─────────────────────────────────────────────

/**
 * GET /api/whatsapp/templates
 * Fetch all templates (works for both Meta & Pinbot)
 */
router.get('/templates', authenticate, async (req, res) => {
    try {
        const config = await getWhatsAppConfig(req.user.id);
        const params = {};
        if (req.query.fields) params.fields = req.query.fields;
        if (req.query.limit) params.limit = req.query.limit;
        if (req.query.status) params.status = req.query.status;

        const response = await axios.get(getTemplatesUrl(config), {
            headers: getHeaders(config),
            params
        });

        // Pinbot returns { data: [...] } same as Graph
        const templates = response.data.data || response.data || [];
        res.json({
            success: true,
            templates,
            provider: config.isPinbot ? 'pinbot' : 'graph',
            paging: response.data.paging
        });
    } catch (error) {
        console.error('❌ Error fetching WA templates:', error.response?.data || error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch WhatsApp templates',
            error: error.response?.data?.error?.message || error.response?.data?.message || error.message
        });
    }
});

/**
 * GET /api/whatsapp/templates/:templateId
 * Get single template by ID
 */
router.get('/templates/:templateId', authenticate, async (req, res) => {
    try {
        const config = await getWhatsAppConfig(req.user.id);
        const url = config.isPinbot
            ? `${PINBOT_BASE}/${req.params.templateId}`
            : `${GRAPH_BASE}/${req.params.templateId}`;

        const response = await axios.get(url, { headers: getHeaders(config) });
        res.json({ success: true, data: response.data });
    } catch (error) {
        console.error('❌ Error fetching template by ID:', error.response?.data || error.message);
        res.status(500).json({ success: false, message: error.message, error: error.response?.data });
    }
});

/**
 * POST /api/whatsapp/templates
 * Create a new template (text, image, video, doc, location, carousel, buttons, copy_code, catalog, mpm)
 */
router.post('/templates', authenticate, async (req, res) => {
    try {
        const { name, category, language, components, allow_category_change } = req.body;
        const config = await getWhatsAppConfig(req.user.id);

        if (!name || !category || !language || !components) {
            return res.status(400).json({ success: false, message: 'name, category, language, and components are required' });
        }

        const payload = { name, category, language, components };
        if (allow_category_change !== undefined) payload.allow_category_change = allow_category_change;

        const response = await axios.post(getTemplatesUrl(config), payload, {
            headers: getHeaders(config)
        });

        res.json({
            success: true,
            message: 'Template created successfully',
            data: response.data,
            provider: config.isPinbot ? 'pinbot' : 'graph'
        });
    } catch (error) {
        console.error('❌ Error creating WA template:', error.response?.data || error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to create WhatsApp template',
            error: error.response?.data?.error?.message || error.response?.data?.message || error.message
        });
    }
});

/**
 * PUT /api/whatsapp/templates/:templateId
 * Edit existing template (Pinbot uses POST to /:msgtemplateid, Graph uses POST similarly)
 */
router.put('/templates/:templateId', authenticate, async (req, res) => {
    try {
        const config = await getWhatsAppConfig(req.user.id);
        const url = config.isPinbot
            ? `${PINBOT_BASE}/${req.params.templateId}`
            : `${GRAPH_BASE}/${req.params.templateId}`;

        const response = await axios.post(url, req.body, { headers: getHeaders(config) });
        res.json({ success: true, message: 'Template updated', data: response.data });
    } catch (error) {
        console.error('❌ Error editing WA template:', error.response?.data || error.message);
        res.status(500).json({ success: false, message: error.message, error: error.response?.data });
    }
});

/**
 * DELETE /api/whatsapp/templates/:name
 * Delete template by name
 */
router.delete('/templates/:name', authenticate, async (req, res) => {
    try {
        const templateName = req.params.name;
        const config = await getWhatsAppConfig(req.user.id);

        const params = { name: templateName };
        if (req.query.hsm_id) params.hsm_id = req.query.hsm_id;

        const response = await axios.delete(getTemplatesUrl(config), {
            headers: getHeaders(config),
            params
        });

        res.json({ success: true, message: 'Template deleted', data: response.data });
    } catch (error) {
        console.error('❌ Error deleting WA template:', error.response?.data || error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to delete WhatsApp template',
            error: error.response?.data?.error?.message || error.response?.data?.message || error.message
        });
    }
});

// ─────────────────────────────────────────────
// SEND MESSAGES
// ─────────────────────────────────────────────

/**
 * POST /api/whatsapp/send
 * Universal send — full WhatsApp message payload
 */
router.post('/send', authenticate, async (req, res) => {
    try {
        const config = await getWhatsAppConfig(req.user.id);
        const payload = req.body;

        if (!payload.to) return res.status(400).json({ success: false, message: '`to` is required' });
        if (!payload.type) return res.status(400).json({ success: false, message: '`type` is required' });
        if (!payload.messaging_product) payload.messaging_product = 'whatsapp';

        const response = await axios.post(getMessagesUrl(config), payload, {
            headers: getHeaders(config)
        });

        res.json({ success: true, message: 'Message sent', data: response.data, provider: config.isPinbot ? 'pinbot' : 'graph' });
    } catch (error) {
        console.error('❌ Error sending WA message:', error.response?.data || error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to send message',
            error: error.response?.data?.error?.message || error.response?.data?.message || error.message
        });
    }
});

/**
 * POST /api/whatsapp/send-template
 * Simplified template send
 */
router.post('/send-template', authenticate, async (req, res) => {
    try {
        const { to, templateName, languageCode, components } = req.body;
        const config = await getWhatsAppConfig(req.user.id);

        if (!to || !templateName) {
            return res.status(400).json({ success: false, message: 'Recipient and template name are required' });
        }

        const data = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to,
            type: 'template',
            template: {
                name: templateName,
                language: { code: languageCode || 'en_US' }
            }
        };
        if (components) data.template.components = components;

        const response = await axios.post(getMessagesUrl(config), data, {
            headers: getHeaders(config)
        });

        res.json({
            success: true,
            message: 'Template message sent successfully',
            data: response.data,
            provider: config.isPinbot ? 'pinbot' : 'graph'
        });
    } catch (error) {
        console.error('❌ Error sending WA template:', error.response?.data || error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to send WhatsApp message',
            error: error.response?.data?.error?.message || error.response?.data?.message || error.message
        });
    }
});

/**
 * POST /api/whatsapp/mark-read
 * Mark message as read
 */
router.post('/mark-read', authenticate, async (req, res) => {
    try {
        const config = await getWhatsAppConfig(req.user.id);
        const { message_id } = req.body;
        if (!message_id) return res.status(400).json({ success: false, message: 'message_id required' });

        const payload = { messaging_product: 'whatsapp', status: 'read', message_id };
        const response = await axios.post(getMessagesUrl(config), payload, {
            headers: getHeaders(config)
        });

        res.json({ success: true, message: 'Marked as read', data: response.data });
    } catch (error) {
        console.error('❌ Error marking read:', error.response?.data || error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ─────────────────────────────────────────────
// WEBHOOK MANAGEMENT (Pinbot only)
// ─────────────────────────────────────────────

/**
 * POST /api/whatsapp/set-webhook
 */
router.post('/set-webhook', authenticate, async (req, res) => {
    try {
        const config = await getWhatsAppConfig(req.user.id);
        if (!config.isPinbot) {
            return res.status(400).json({ success: false, message: 'Webhook management is only for Pinbot provider. Meta webhooks are configured in Facebook Developer Console.' });
        }

        const { webhook_url, headers: customHeaders } = req.body;
        if (!webhook_url) return res.status(400).json({ success: false, message: 'webhook_url is required' });

        const payload = { webhook_url };
        if (customHeaders) payload.headers = customHeaders;

        const response = await axios.post(`${PINBOT_BASE}/${config.ph_no_id}/setwebhook`, payload, {
            headers: getHeaders(config)
        });
        res.json({ success: true, message: 'Webhook set', data: response.data });
    } catch (error) {
        console.error('❌ Error setting webhook:', error.response?.data || error.message);
        res.status(500).json({ success: false, message: error.message, error: error.response?.data });
    }
});

/**
 * GET /api/whatsapp/get-webhook
 */
router.get('/get-webhook', authenticate, async (req, res) => {
    try {
        const config = await getWhatsAppConfig(req.user.id);
        if (!config.isPinbot) {
            return res.status(400).json({ success: false, message: 'Webhook view is only for Pinbot. Check Facebook Developer Console for Meta.' });
        }

        const response = await axios.get(`${PINBOT_BASE}/${config.ph_no_id}/getwebhook`, {
            headers: getHeaders(config)
        });
        res.json({ success: true, data: response.data });
    } catch (error) {
        console.error('❌ Error getting webhook:', error.response?.data || error.message);
        res.status(500).json({ success: false, message: error.message, error: error.response?.data });
    }
});

// ─────────────────────────────────────────────
// PROVIDER STATUS CHECK
// ─────────────────────────────────────────────

/**
 * GET /api/whatsapp/status
 * Check current user's WhatsApp provider status
 */
router.get('/status', authenticate, async (req, res) => {
    try {
        const config = await getWhatsAppConfig(req.user.id);
        res.json({
            success: true,
            provider: config.isPinbot ? 'pinbot' : 'graph',
            providerLabel: config.isPinbot ? 'Pinbot (Pinnacle)' : 'Meta Graph API',
            config: {
                chatbot_name: config.chatbot_name,
                ph_no_id: config.ph_no_id,
                wa_biz_accnt_id: config.wa_biz_accnt_id,
                wanumber: config.wanumber
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ─────────────────────────────────────────────
// USER DETAILS (Pinbot only)
// ─────────────────────────────────────────────

router.get('/user-details', authenticate, async (req, res) => {
    try {
        const config = await getWhatsAppConfig(req.user.id);
        if (!config.isPinbot) {
            return res.json({ success: true, message: 'User details not available for Meta Graph API', provider: 'graph' });
        }
        const response = await axios.get(`${PINBOT_BASE}/getuserdetails`, { headers: getHeaders(config) });
        res.json({ success: true, data: response.data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ─────────────────────────────────────────────
// SEND CAMPAIGN (Queue-based, same as RCS flow)
// ─────────────────────────────────────────────

/**
 * POST /api/whatsapp/send-campaign
 * Queue contacts for WhatsApp campaign sending
 */
router.post('/send-campaign', authenticate, async (req, res) => {
    try {
        const { campaignName, contacts, templateName } = req.body;
        const userId = req.user.id;
        let campaignId = req.body.campaignId;

        let finalTemplate = templateName;
        if (!finalTemplate && campaignId) {
            const [campaigns] = await query('SELECT template_id, template_name FROM campaigns WHERE id = ?', [campaignId]);
            if (campaigns && campaigns.length > 0) {
                finalTemplate = campaigns[0].template_name || campaigns[0].template_id;
            }
        }

        if (!finalTemplate) {
            return res.status(400).json({ success: false, message: 'Template name is required' });
        }

        // Queue contacts
        if (contacts && contacts.length > 0) {
            if (!campaignId) {
                campaignId = `CAMP_${Date.now()}`;
                await query(
                    `INSERT INTO campaigns (id, user_id, name, channel, template_id, template_name, recipient_count, sent_count, failed_count, status, created_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 'running', NOW())`,
                    [campaignId, userId, campaignName, 'whatsapp', finalTemplate, finalTemplate, contacts.length]
                );
                console.log(`✅ Created WhatsApp campaign ${campaignId} for ${contacts.length} contacts`);
            } else {
                await query('UPDATE campaigns SET recipient_count = recipient_count + ? WHERE id = ?', [contacts.length, campaignId]);
            }

            const values = contacts.map(c => {
                const mobile = typeof c === 'object' ? (c.mobile || c.phone) : c;
                if (!mobile) return null;
                const cleanMobile = mobile.replace(/\D/g, '');
                return [campaignId, userId, cleanMobile, 'pending'];
            }).filter(Boolean);

            if (values.length > 0) {
                const BATCH = 1000;
                for (let i = 0; i < values.length; i += BATCH) {
                    await query('INSERT INTO campaign_queue (campaign_id, user_id, mobile, status) VALUES ?', [values.slice(i, i + BATCH)]);
                }
                console.log(`✅ Queued ${values.length} contacts for WhatsApp campaign ${campaignId}`);
            }
        } else if (!campaignId) {
            return res.status(400).json({ success: false, message: 'No contacts provided and no campaign ID' });
        }

        // Set campaign running & deduct credits
        if (campaignId) {
            await query('UPDATE campaigns SET status = "running" WHERE id = ? AND user_id = ?', [campaignId, userId]);

            const { deductCampaignCredits } = require('../services/walletService');
            const deductionResult = await deductCampaignCredits(campaignId);
            if (!deductionResult.success) {
                console.error(`❌ Credit deduction failed for WA campaign ${campaignId}: ${deductionResult.message}`);
                await query('UPDATE campaigns SET status = "failed" WHERE id = ?', [campaignId]);
                return res.status(402).json({ success: false, message: deductionResult.message || 'Insufficient wallet balance' });
            }

            return res.json({
                success: true,
                message: 'WhatsApp campaign processing started',
                campaignId,
                queued: contacts ? contacts.length : 0
            });
        }

        return res.status(500).json({ success: false, message: 'Unexpected flow error' });
    } catch (error) {
        console.error('❌ WhatsApp campaign send error:', error.message);
        res.status(500).json({ success: false, message: 'Failed to send WhatsApp campaign' });
    }
});

module.exports = router;

