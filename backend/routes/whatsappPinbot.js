/**
 * WhatsApp Pinbot (Pinnacle Partners API v3) Routes
 * Base URL: https://partnersv1.pinbot.ai
 * Auth: apikey in header
 */

const express = require('express');
const axios = require('axios');
const multer = require('multer');
const { query } = require('../config/db');
const authenticate = require('../middleware/authMiddleware');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const PINBOT_BASE = 'https://partnersv1.pinbot.ai/v3';

// ─────────────────────────────────────────────
// HELPER: Get Pinbot config for logged-in user
// ─────────────────────────────────────────────
const getPinbotConfig = async (userId) => {
    const [users] = await query('SELECT whatsapp_config_id FROM users WHERE id = ?', [userId]);
    if (!users.length || !users[0].whatsapp_config_id) {
        throw new Error('WhatsApp not configured for this account');
    }
    const [configs] = await query(
        "SELECT * FROM whatsapp_configs WHERE id = ? AND is_active = 1 AND provider = 'vendor2'",
        [users[0].whatsapp_config_id]
    );
    if (!configs.length) {
        throw new Error('Pinbot configuration not found or inactive. Please set provider to Pinbot.');
    }
    return configs[0];
};

// ─────────────────────────────────────────────────────────────────
// TEMPLATES
// ─────────────────────────────────────────────────────────────────

/**
 * GET /api/whatsapp-pinbot/templates
 * Fetch all templates for WABA account
 */
router.get('/templates', authenticate, async (req, res) => {
    try {
        const config = await getPinbotConfig(req.user.id);
        const params = {};
        if (req.query.fields) params.fields = req.query.fields;
        if (req.query.limit) params.limit = req.query.limit;
        if (req.query.status) params.status = req.query.status;
        if (req.query.before) params.before = req.query.before;
        if (req.query.after) params.after = req.query.after;

        const response = await axios.get(`${PINBOT_BASE}/${config.wa_biz_accnt_id}/message_templates`, {
            headers: { apikey: config.api_key },
            params
        });
        res.json({ success: true, data: response.data });
    } catch (error) {
        console.error('❌ Pinbot GET templates:', error.response?.data || error.message);
        res.status(500).json({ success: false, message: error.response?.data?.message || error.message, error: error.response?.data });
    }
});

/**
 * GET /api/whatsapp-pinbot/templates/:templateId
 * Get template by ID
 */
router.get('/templates/:templateId', authenticate, async (req, res) => {
    try {
        const config = await getPinbotConfig(req.user.id);
        const response = await axios.get(`${PINBOT_BASE}/${req.params.templateId}`, {
            headers: { apikey: config.api_key }
        });
        res.json({ success: true, data: response.data });
    } catch (error) {
        console.error('❌ Pinbot GET template by ID:', error.response?.data || error.message);
        res.status(500).json({ success: false, message: error.message, error: error.response?.data });
    }
});

/**
 * GET /api/whatsapp-pinbot/waba-info
 * Get WABA info / message template namespace
 */
router.get('/waba-info', authenticate, async (req, res) => {
    try {
        const config = await getPinbotConfig(req.user.id);
        const fields = req.query.fields || 'message_template_namespace';
        const response = await axios.get(`${PINBOT_BASE}/${config.wa_biz_accnt_id}`, {
            headers: { apikey: config.api_key },
            params: { fields }
        });
        res.json({ success: true, data: response.data });
    } catch (error) {
        console.error('❌ Pinbot GET WABA info:', error.response?.data || error.message);
        res.status(500).json({ success: false, message: error.message, error: error.response?.data });
    }
});

/**
 * POST /api/whatsapp-pinbot/templates
 * Create a new template (text, image, video, document, location, carousel, copy_code, catalog, mpm)
 */
router.post('/templates', authenticate, async (req, res) => {
    try {
        const config = await getPinbotConfig(req.user.id);
        const { name, category, language, components, allow_category_change } = req.body;

        // 🛠️ ENHANCEMENT: Auto-generate examples for body placeholders if missing
        // Meta/Pinbot require examples for variable like {{1}}, {{2}} etc.
        const processedComponents = components.map(comp => {
            const normalizedComp = { ...comp };
            const typeUC = (normalizedComp.type || '').toUpperCase();
            
            if (typeUC === 'BODY' && normalizedComp.text && normalizedComp.text.includes('{{')) {
                if (!normalizedComp.example || !normalizedComp.example.body_text) {
                    const matches = normalizedComp.text.match(/{{(\d+)}}/g);
                    if (matches) {
                        const count = matches.length;
                        console.log(`[WA-PINBOT] Auto-generating ${count} examples for BODY variables`);
                        normalizedComp.example = {
                            body_text: [ matches.map((_, i) => `SampleValue ${i+1}`) ]
                        };
                    }
                }
            }
            return normalizedComp;
        });

        const payload = { 
            name: name.toLowerCase().replace(/[^a-z0-9_]/g, '_'), 
            category, 
            language, 
            components: processedComponents 
        };
        if (allow_category_change !== undefined) payload.allow_category_change = allow_category_change;

        const response = await axios.post(
            `${PINBOT_BASE}/${config.wa_biz_accnt_id}/message_templates`,
            payload,
            { headers: { apikey: config.api_key, 'Content-Type': 'application/json' } }
        );

        res.json({ success: true, message: 'Template created successfully', data: response.data });
    } catch (error) {
        console.error('❌ Pinbot CREATE template:', error.response?.data || error.message);
        res.status(500).json({ success: false, message: error.response?.data?.message || error.message, error: error.response?.data });
    }
});

/**
 * PUT /api/whatsapp-pinbot/templates/:templateId
 * Edit existing template (POST to /:msgtemplateid in Pinbot)
 */
router.put('/templates/:templateId', authenticate, async (req, res) => {
    try {
        const config = await getPinbotConfig(req.user.id);
        const response = await axios.post(
            `${PINBOT_BASE}/${req.params.templateId}`,
            req.body,
            { headers: { apikey: config.api_key, 'Content-Type': 'application/json' } }
        );
        res.json({ success: true, message: 'Template updated successfully', data: response.data });
    } catch (error) {
        console.error('❌ Pinbot EDIT template:', error.response?.data || error.message);
        res.status(500).json({ success: false, message: error.message, error: error.response?.data });
    }
});

/**
 * DELETE /api/whatsapp-pinbot/templates/:name
 * Delete template by name (and optionally hsm_id)
 */
router.delete('/templates/:name', authenticate, async (req, res) => {
    try {
        const config = await getPinbotConfig(req.user.id);
        const params = { name: req.params.name };
        if (req.query.hsm_id) params.hsm_id = req.query.hsm_id;

        const response = await axios.delete(
            `${PINBOT_BASE}/${config.wa_biz_accnt_id}/message_templates`,
            { headers: { apikey: config.api_key }, params }
        );
        res.json({ success: true, message: 'Template deleted', data: response.data });
    } catch (error) {
        console.error('❌ Pinbot DELETE template:', error.response?.data || error.message);
        res.status(500).json({ success: false, message: error.message, error: error.response?.data });
    }
});

// ─────────────────────────────────────────────────────────────────
// HEADER HANDLE (Retrieve Header Handle for media templates)
// Step 1: Create session, Step 2: Upload file
// ─────────────────────────────────────────────────────────────────

/**
 * POST /api/whatsapp-pinbot/header-handle/session
 * Step 1: Create an upload session
 * body: { file_length, file_type }
 */
router.post('/header-handle/session', authenticate, async (req, res) => {
    try {
        const config = await getPinbotConfig(req.user.id);
        const { file_length, file_type } = req.body;

        if (!file_length || !file_type) {
            return res.status(400).json({ success: false, message: 'file_length and file_type are required' });
        }

        const response = await axios.post(`${PINBOT_BASE}/app/uploads`, null, {
            headers: { apikey: config.api_key },
            params: { file_length, file_type }
        });
        res.json({ success: true, message: 'Upload session created', data: response.data });
    } catch (error) {
        console.error('❌ Pinbot CREATE upload session:', error.response?.data || error.message);
        res.status(500).json({ success: false, message: error.message, error: error.response?.data });
    }
});

/**
 * POST /api/whatsapp-pinbot/header-handle/upload
 * Step 2: Upload the actual file using the upload session ID
 * body (multipart): file + session_id + sig
 */
router.post('/header-handle/upload', authenticate, upload.single('file'), async (req, res) => {
    try {
        const config = await getPinbotConfig(req.user.id);
        const { session_id, sig } = req.body;

        if (!session_id || !req.file) {
            return res.status(400).json({ success: false, message: 'session_id and file are required' });
        }

        const FormData = require('form-data');
        const form = new FormData();
        form.append('file', req.file.buffer, {
            filename: req.file.originalname,
            contentType: req.file.mimetype
        });

        const url = `${PINBOT_BASE}/${session_id}${sig ? `?sig=${sig}` : ''}`;
        const response = await axios.post(url, form, {
            headers: {
                apikey: config.api_key,
                ...form.getHeaders()
            }
        });
        res.json({ success: true, message: 'File uploaded, header handle retrieved', data: response.data });
    } catch (error) {
        console.error('❌ Pinbot UPLOAD file:', error.response?.data || error.message);
        res.status(500).json({ success: false, message: error.message, error: error.response?.data });
    }
});

// ─────────────────────────────────────────────────────────────────
// MEDIA
// ─────────────────────────────────────────────────────────────────

/**
 * POST /api/whatsapp-pinbot/media
 * Upload media
 */
router.post('/media', authenticate, upload.single('sheet'), async (req, res) => {
    try {
        const config = await getPinbotConfig(req.user.id);
        if (!req.file) return res.status(400).json({ success: false, message: 'File is required' });

        const FormData = require('form-data');
        const form = new FormData();
        form.append('sheet', req.file.buffer, {
            filename: req.file.originalname,
            contentType: req.file.mimetype
        });

        const response = await axios.post(
            `${PINBOT_BASE}/${config.ph_no_id}/media`,
            form,
            { headers: { apikey: config.api_key, ...form.getHeaders() } }
        );
        res.json({ success: true, message: 'Media uploaded', data: response.data });
    } catch (error) {
        console.error('❌ Pinbot UPLOAD media:', error.response?.data || error.message);
        res.status(500).json({ success: false, message: error.message, error: error.response?.data });
    }
});

/**
 * GET /api/whatsapp-pinbot/media/:mediaId
 * Get media URL
 */
router.get('/media/:mediaId', authenticate, async (req, res) => {
    try {
        const config = await getPinbotConfig(req.user.id);
        const response = await axios.get(`${PINBOT_BASE}/${req.params.mediaId}`, {
            headers: { apikey: config.api_key },
            params: { phone_number_id: config.ph_no_id }
        });
        res.json({ success: true, data: response.data });
    } catch (error) {
        console.error('❌ Pinbot GET media URL:', error.response?.data || error.message);
        res.status(500).json({ success: false, message: error.message, error: error.response?.data });
    }
});

/**
 * DELETE /api/whatsapp-pinbot/media/:mediaId
 * Delete media
 */
router.delete('/media/:mediaId', authenticate, async (req, res) => {
    try {
        const config = await getPinbotConfig(req.user.id);
        const response = await axios.delete(`${PINBOT_BASE}/${req.params.mediaId}`, {
            headers: { apikey: config.api_key },
            params: { phone_number_id: config.ph_no_id }
        });
        res.json({ success: true, message: 'Media deleted', data: response.data });
    } catch (error) {
        console.error('❌ Pinbot DELETE media:', error.response?.data || error.message);
        res.status(500).json({ success: false, message: error.message, error: error.response?.data });
    }
});

// ─────────────────────────────────────────────────────────────────
// SEND MESSAGES
// ─────────────────────────────────────────────────────────────────

/**
 * POST /api/whatsapp-pinbot/send
 * Universal send message endpoint
 * Supports: template, text, image, video, document, contact, location, interactive (list, button, carousel), catalog, mpm
 * body: full WhatsApp message payload
 */
router.post('/send', authenticate, async (req, res) => {
    try {
        const config = await getPinbotConfig(req.user.id);
        const payload = req.body;

        if (!payload.to) {
            return res.status(400).json({ success: false, message: '`to` (recipient number) is required' });
        }
        if (!payload.type) {
            return res.status(400).json({ success: false, message: '`type` is required (template, text, image, etc.)' });
        }

        // Ensure messaging_product is set
        if (!payload.messaging_product) payload.messaging_product = 'whatsapp';

        const response = await axios.post(
            `${PINBOT_BASE}/${config.ph_no_id}/messages`,
            payload,
            { headers: { apikey: config.api_key, 'Content-Type': 'application/json' } }
        );
        res.json({ success: true, message: 'Message sent successfully', data: response.data });
    } catch (error) {
        console.error('❌ Pinbot SEND message:', error.response?.data || error.message);
        res.status(500).json({ success: false, message: error.response?.data?.message || error.message, error: error.response?.data });
    }
});

/**
 * POST /api/whatsapp-pinbot/send-template
 * Simplified template send
 * body: { to, templateName, languageCode, components }
 */
router.post('/send-template', authenticate, async (req, res) => {
    try {
        const config = await getPinbotConfig(req.user.id);
        const { to, templateName, languageCode, components } = req.body;

        if (!to || !templateName) {
            return res.status(400).json({ success: false, message: 'to and templateName are required' });
        }

        const payload = {
            messaging_product: 'whatsapp',
            recipient_type: 'INDIVIDUAL',
            to,
            type: 'template',
            template: {
                name: templateName,
                language: { code: languageCode || 'en_US' }
            }
        };
        if (components) payload.template.components = components;

        const response = await axios.post(
            `${PINBOT_BASE}/${config.ph_no_id}/messages`,
            payload,
            { headers: { apikey: config.api_key, 'Content-Type': 'application/json' } }
        );
        res.json({ success: true, message: 'Template message sent', data: response.data });
    } catch (error) {
        console.error('❌ Pinbot SEND template:', error.response?.data || error.message);
        res.status(500).json({ success: false, message: error.response?.data?.message || error.message, error: error.response?.data });
    }
});

/**
 * POST /api/whatsapp-pinbot/mark-read
 * Mark message as read
 * body: { message_id }
 */
router.post('/mark-read', authenticate, async (req, res) => {
    try {
        const config = await getPinbotConfig(req.user.id);
        const { message_id } = req.body;
        if (!message_id) return res.status(400).json({ success: false, message: 'message_id is required' });

        const payload = {
            messaging_product: 'whatsapp',
            status: 'read',
            message_id
        };
        const response = await axios.post(
            `${PINBOT_BASE}/${config.ph_no_id}/messages`,
            payload,
            { headers: { apikey: config.api_key, 'Content-Type': 'application/json' } }
        );
        res.json({ success: true, message: 'Message marked as read', data: response.data });
    } catch (error) {
        console.error('❌ Pinbot MARK READ:', error.response?.data || error.message);
        res.status(500).json({ success: false, message: error.message, error: error.response?.data });
    }
});

// ─────────────────────────────────────────────────────────────────
// WEBHOOK MANAGEMENT
// ─────────────────────────────────────────────────────────────────

/**
 * POST /api/whatsapp-pinbot/set-webhook
 * Set webhook URL for receiving messages
 * body: { webhook_url, headers }
 */
router.post('/set-webhook', authenticate, async (req, res) => {
    try {
        const config = await getPinbotConfig(req.user.id);
        const { webhook_url, headers: customHeaders } = req.body;

        if (!webhook_url) return res.status(400).json({ success: false, message: 'webhook_url is required' });

        const payload = { webhook_url };
        if (customHeaders) payload.headers = customHeaders;

        const response = await axios.post(
            `${PINBOT_BASE}/${config.ph_no_id}/setwebhook`,
            payload,
            { headers: { apikey: config.api_key, 'Content-Type': 'application/json' } }
        );
        res.json({ success: true, message: 'Webhook set successfully', data: response.data });
    } catch (error) {
        console.error('❌ Pinbot SET webhook:', error.response?.data || error.message);
        res.status(500).json({ success: false, message: error.message, error: error.response?.data });
    }
});

/**
 * GET /api/whatsapp-pinbot/get-webhook
 * Get current webhook configuration
 */
router.get('/get-webhook', authenticate, async (req, res) => {
    try {
        const config = await getPinbotConfig(req.user.id);
        const response = await axios.get(
            `${PINBOT_BASE}/${config.ph_no_id}/getwebhook`,
            { headers: { apikey: config.api_key } }
        );
        res.json({ success: true, data: response.data });
    } catch (error) {
        console.error('❌ Pinbot GET webhook:', error.response?.data || error.message);
        res.status(500).json({ success: false, message: error.message, error: error.response?.data });
    }
});

// ─────────────────────────────────────────────────────────────────
// USER DETAILS
// ─────────────────────────────────────────────────────────────────

/**
 * GET /api/whatsapp-pinbot/user-details
 * Get Pinbot account user details
 */
router.get('/user-details', authenticate, async (req, res) => {
    try {
        const config = await getPinbotConfig(req.user.id);
        const response = await axios.get(`${PINBOT_BASE}/getuserdetails`, {
            headers: { apikey: config.api_key }
        });
        res.json({ success: true, data: response.data });
    } catch (error) {
        console.error('❌ Pinbot GET user details:', error.response?.data || error.message);
        res.status(500).json({ success: false, message: error.message, error: error.response?.data });
    }
});

/**
 * GET /api/whatsapp-pinbot/waba-details
 * Get WABA info
 */
router.get('/waba-details', authenticate, async (req, res) => {
    try {
        const config = await getPinbotConfig(req.user.id);
        const response = await axios.get(`${PINBOT_BASE}/${config.wa_biz_accnt_id}`, {
            headers: { apikey: config.api_key }
        });
        res.json({ success: true, data: response.data });
    } catch (error) {
        console.error('❌ Pinbot GET WABA details:', error.response?.data || error.message);
        res.status(500).json({ success: false, message: error.message, error: error.response?.data });
    }
});

// ─────────────────────────────────────────────────────────────────
// PAYMENTS
// ─────────────────────────────────────────────────────────────────

/**
 * POST /api/whatsapp-pinbot/payment-refund
 * Initiate a payment refund
 * body: { reference_id, speed, payment_config_id, amount: { currency, value, offset } }
 */
router.post('/payment-refund', authenticate, async (req, res) => {
    try {
        const config = await getPinbotConfig(req.user.id);
        const { reference_id, speed, payment_config_id, amount } = req.body;

        if (!reference_id || !amount) {
            return res.status(400).json({ success: false, message: 'reference_id and amount are required' });
        }

        const response = await axios.post(
            `${PINBOT_BASE}/${config.ph_no_id}/payments_refund`,
            { reference_id, speed: speed || 'normal', payment_config_id, amount },
            { headers: { apikey: config.api_key, 'Content-Type': 'application/json' } }
        );
        res.json({ success: true, message: 'Refund initiated', data: response.data });
    } catch (error) {
        console.error('❌ Pinbot PAYMENT REFUND:', error.response?.data || error.message);
        res.status(500).json({ success: false, message: error.message, error: error.response?.data });
    }
});

// ─────────────────────────────────────────────────────────────────
// DEBUG / STATUS
// ─────────────────────────────────────────────────────────────────

/**
 * GET /api/whatsapp-pinbot/status
 * Quick check to verify Pinbot config is working
 */
router.get('/status', authenticate, async (req, res) => {
    try {
        const config = await getPinbotConfig(req.user.id);
        res.json({
            success: true,
            message: 'Pinbot configuration found and active',
            config: {
                chatbot_name: config.chatbot_name,
                ph_no_id: config.ph_no_id,
                wa_biz_accnt_id: config.wa_biz_accnt_id,
                wanumber: config.wanumber,
                provider: config.provider,
                api_key_preview: config.api_key ? config.api_key.substring(0, 8) + '...' : null
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
