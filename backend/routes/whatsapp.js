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
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '..', 'uploads', 'whatsapp_media');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, `wa_${Date.now()}_${file.originalname}`);
    }
});
const uploadDisk = multer({ storage });
const uploadMemory = multer({ storage: multer.memoryStorage() });

/**
 * Helper: Get WhatsApp config + detect provider
 */
const getWhatsAppConfig = async (userId) => {
    const [users] = await query('SELECT whatsapp_config_id FROM users WHERE id = ?', [userId]);
    if (!users.length || !users[0].whatsapp_config_id) {
        return null; // Return null instead of throwing
    }

    const [configs] = await query('SELECT * FROM whatsapp_configs WHERE id = ? AND is_active = 1', [users[0].whatsapp_config_id]);
    if (!configs.length) {
        return null;
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

        // Safety: If no config found, return empty list gracefully
        if (!config || !config.wa_biz_accnt_id) {
            return res.json({ success: true, templates: [], message: 'WhatsApp not configured for this account' });
        }

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
// MEDIA & UPLOADS (Pinbot only)
// ─────────────────────────────────────────────

/**
 * POST /api/whatsapp/header-handle/session
 * Step 1: Create an upload session
 * Params: file_length (bytes), file_type (e.g. image/png)
 * Returns: { id: 'upload:XXX', sig: 'YYYY' }
 */
router.post('/header-handle/session', authenticate, async (req, res) => {
    try {
        const config = await getWhatsAppConfig(req.user.id);
        if (!config || !config.isPinbot) {
            return res.status(400).json({ success: false, message: 'Header handle proxy is only for Pinbot.' });
        }

        const { file_length, file_type } = req.body;
        if (!file_length || !file_type) {
            return res.status(400).json({ success: false, message: 'file_length and file_type are required' });
        }

        console.log(`📤 Creating Pinbot upload session: length=${file_length}, type=${file_type}`);

        const response = await axios.post(`${PINBOT_BASE}/app/uploads`, null, {
            headers: { apikey: config.api_key },
            params: { file_length, file_type }
        });

        console.log('✅ Upload session created:', response.data);
        res.json({ success: true, message: 'Upload session created', data: response.data });
    } catch (error) {
        console.error('❌ Error creating upload session:', error.response?.data || error.message);
        res.status(500).json({ success: false, message: error.message, error: error.response?.data });
    }
});

// POST /api/whatsapp/header-handle/upload
// Step 2: Upload file as raw binary to Pinbot
router.post('/header-handle/upload', authenticate, uploadMemory.single('file'), async (req, res) => {
    try {
        const config = await getWhatsAppConfig(req.user.id);
        if (!config || !config.isPinbot) {
            return res.status(400).json({ success: false, message: 'Header handle proxy is only for Pinbot.' });
        }

        const { session_id, sig } = req.body;
        if (!session_id || !req.file) {
            return res.status(400).json({ success: false, message: 'session_id and file are required' });
        }

        // Build the Pinbot upload URL
        // session_id from Step 1 looks like: "upload:MTphdHR..."
        // URL format: https://partnersv1.pinbot.ai/v3/upload:XXXXX?sig=YYYY
        const uploadPath = session_id.startsWith('upload:') ? session_id : `upload:${session_id}`;
        const url = `${PINBOT_BASE}/${uploadPath}${sig ? `?sig=${sig}` : ''}`;

        console.log(`📤 Uploading to Pinbot (raw binary): ${url}`);
        console.log(`   File: ${req.file.originalname}, Size: ${req.file.size}, MIME: ${req.file.mimetype}`);

        // CRITICAL: Send raw binary body with the actual file MIME type
        // Pinbot Step 2 requires raw binary (no multipart), with the file's mimetype as Content-Type
        const fileMimeType = req.file.mimetype || 'application/octet-stream';
        console.log(`   Sending Content-Type: ${fileMimeType} to Pinbot`);

        const response = await axios.post(url, req.file.buffer, {
            headers: {
                'apikey': config.api_key,
                'Content-Type': fileMimeType
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });

        console.log('✅ Pinbot upload response:', response.data);

        // Response contains { h: 'header_handle_value' }
        res.json({
            success: true,
            message: 'File uploaded successfully',
            data: response.data,
            header_handle: response.data?.h  // Make it easy to access
        });
    } catch (error) {
        console.error('❌ Error uploading file for handle:', error.response?.data || error.message);
        res.status(500).json({
            success: false,
            message: error.response?.data?.message || error.message,
            error: error.response?.data
        });
    }
});

/**
 * POST /api/whatsapp/media
 * Upload media directly
 */
router.post('/media', authenticate, uploadMemory.single('file'), async (req, res) => {
    try {
        const config = await getWhatsAppConfig(req.user.id);
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

router.post('/media/upload-local', authenticate, uploadDisk.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
        
        console.log(`[WA-UPLOAD] Received file for user ${req.user.id}: ${req.file.originalname}`);
        const config = await getWhatsAppConfig(req.user.id);
        
        if (!config) {
            console.log(`[WA-UPLOAD] WARN: No WhatsApp config found for user ${req.user.id}`);
        }

        // If Pinbot user, upload to Pinbot to get a global ID instead of using localhost URL
        if (config && config.isPinbot) {
            const uploadId = config.ph_no_id || config.wa_phone_number_id; 
            console.log(`[WA-UPLOAD] Detected Pinbot user. WABA ID: ${config.wa_biz_accnt_id}, Upload ID: ${uploadId}`);
            
            if (uploadId) {
                try {
                    const FormData = require('form-data');
                    const form = new FormData();
                    const fs = require('fs');
                    
                    // Pinbot specifically expects 'sheet' as the field name for media uploads
                    form.append('sheet', fs.createReadStream(req.file.path), {
                        filename: req.file.originalname,
                        contentType: req.file.mimetype
                    });

                    const uploadUrl = `${PINBOT_BASE}/${uploadId}/media`;
                    console.log(`[WA-UPLOAD] Proxying to Pinbot: POST ${uploadUrl}`);

                    const response = await axios.post(
                        uploadUrl,
                        form,
                        { 
                            headers: { 
                                apikey: config.api_key, 
                                ...form.getHeaders() 
                            } 
                        }
                    );
                    
                    if (response.data && response.data.id) {
                        console.log('✅ [WA-UPLOAD] Pinbot Media ID obtained:', response.data.id);
                        return res.json({ success: true, url: response.data.id, isHandle: true });
                    } else {
                        console.log('[WA-UPLOAD] Pinbot upload succeeded but no ID in response:', JSON.stringify(response.data));
                    }
                } catch (pinErr) {
                    const errData = pinErr.response?.data;
                    console.error('[WA-UPLOAD] ❌ Pinbot Proxy Failed:', JSON.stringify(errData || pinErr.message, null, 2));
                    // If error is specific about parameters, log it clearly
                    if (errData?.message?.includes('Unexpected field')) {
                        console.log('[WA-UPLOAD] TIP: The field name might be incorrect. Current: "sheet"');
                    }
                }
            } else {
                console.log('[WA-UPLOAD] WARN: Cannot proxy to Pinbot - no ph_no_id or wa_phone_number_id available');
            }
        }

        const protocol = req.protocol === 'https' ? 'https' : (req.get('x-forwarded-proto') || req.protocol);
        const host = req.get('host');
        const fileUrl = `${protocol}://${host}/uploads/whatsapp_media/${req.file.filename}`;
        
        console.log(`[WA-UPLOAD] Returning local URL (fallback): ${fileUrl}`);
        res.json({ success: true, url: fileUrl });
    } catch (error) {
        console.error('[WA-UPLOAD] ❌ Fatal Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * GET /api/whatsapp/media/:mediaId
 * Get media details/URL
 */
router.get('/media/:mediaId', authenticate, async (req, res) => {
    try {
        const config = await getWhatsAppConfig(req.user.id);
        if (!config.isPinbot) return res.status(400).json({ success: false, message: 'Media management proxy is for Pinbot.' });

        const response = await axios.get(`${PINBOT_BASE}/${req.params.mediaId}`, {
            headers: { apikey: config.api_key },
            params: { phone_number_id: config.ph_no_id }
        });
        res.json({ success: true, data: response.data });
    } catch (error) {
        console.error('❌ Pinbot GET media:', error.response?.data || error.message);
        res.status(500).json({ success: false, message: error.message, error: error.response?.data });
    }
});

/**
 * DELETE /api/whatsapp/media/:mediaId
 * Delete media
 */
router.delete('/media/:mediaId', authenticate, async (req, res) => {
    try {
        const config = await getWhatsAppConfig(req.user.id);
        if (!config.isPinbot) return res.status(400).json({ success: false, message: 'Media management proxy is for Pinbot.' });

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

// ─────────────────────────────────────────────
// WEBHOOK MANAGEMENT (Pinbot only)
// ─────────────────────────────────────────────

/**
 * POST /api/whatsapp/set-webhook
 * Supports optional config_id for admin override
 */
router.post('/set-webhook', authenticate, async (req, res) => {
    try {
        const { webhook_url, headers: customHeaders, config_id } = req.body;
        if (!webhook_url) return res.status(400).json({ success: false, message: 'webhook_url is required' });

        let config;
        const isAdminRole = req.user.role === 'admin' || req.user.role === 'superadmin';

        if (config_id && isAdminRole) {
            // Admin: fetch config directly by ID
            const [configs] = await query('SELECT * FROM whatsapp_configs WHERE id = ? AND is_active = 1', [config_id]);
            if (!configs.length) return res.status(404).json({ success: false, message: 'Config not found' });
            config = configs[0];
            config.isPinbot = config.provider === 'vendor2';
        } else {
            config = await getWhatsAppConfig(req.user.id);
        }

        if (!config || !config.isPinbot) {
            return res.status(400).json({ success: false, message: 'Webhook management is only for Pinbot provider. Meta webhooks are configured in Facebook Developer Console.' });
        }

        const payload = { webhook_url };
        if (customHeaders && Object.keys(customHeaders).length > 0) payload.headers = customHeaders;

        const response = await axios.post(`${PINBOT_BASE}/${config.ph_no_id}/setwebhook`, payload, {
            headers: { apikey: config.api_key, 'Content-Type': 'application/json' }
        });
        res.json({ success: true, message: 'Webhook set', data: response.data });
    } catch (error) {
        console.error('❌ Error setting webhook:', error.response?.data || error.message);
        res.status(500).json({ success: false, message: error.message, error: error.response?.data });
    }
});

/**
 * GET /api/whatsapp/get-webhook
 * Supports optional config_id query param for admin override
 */
router.get('/get-webhook', authenticate, async (req, res) => {
    try {
        let config;
        const isAdminRole = req.user.role === 'admin' || req.user.role === 'superadmin';
        const config_id = req.query.config_id;

        if (config_id && isAdminRole) {
            const [configs] = await query('SELECT * FROM whatsapp_configs WHERE id = ? AND is_active = 1', [config_id]);
            if (!configs.length) return res.status(404).json({ success: false, message: 'Config not found' });
            config = configs[0];
            config.isPinbot = config.provider === 'vendor2';
        } else {
            config = await getWhatsAppConfig(req.user.id);
        }

        if (!config || !config.isPinbot) {
            return res.status(400).json({ success: false, message: 'Webhook view is only for Pinbot. Check Facebook Developer Console for Meta.' });
        }

        const response = await axios.get(`${PINBOT_BASE}/${config.ph_no_id}/getwebhook`, {
            headers: { apikey: config.api_key }
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
        const { campaignName, contacts, templateName, template_metadata, template_body } = req.body;
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
                    `INSERT INTO campaigns (id, user_id, name, channel, template_id, template_name, recipient_count, sent_count, failed_count, status, created_at, template_metadata, template_body)
                     VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 'running', NOW(), ?, ?)`,
                    [
                        campaignId, userId, campaignName, 'whatsapp', finalTemplate, finalTemplate, contacts.length,
                        template_metadata ? JSON.stringify(template_metadata) : null,
                        template_body || null
                    ]
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

/**
 * GET/POST /api/whatsapp/send-campaign-api
 * Public External API for Clients to Send WhatsApp Campaigns
 */
router.all('/send-campaign-api', async (req, res) => {
    try {
        const payload = req.method === 'POST' ? req.body : req.query;
        const { username, password, numbers, campaignName } = payload;
        const templateName = payload.templateName || payload.template;

        if (!username || !password) {
            return res.status(401).json({ success: false, message: 'username and password are required' });
        }
        if (!templateName) {
            return res.status(400).json({ success: false, message: 'template or templateName is required' });
        }
        if (!numbers) {
            return res.status(400).json({ success: false, message: 'numbers are required (comma separated or array)' });
        }

        // Authenticate user via api_password
        const bcrypt = require('bcryptjs');
        const [users] = await query('SELECT * FROM users WHERE email = ? OR contact_phone = ?', [username, username]);
        if (!users.length) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const user = users[0];
        if (!user.api_password) {
            return res.status(401).json({ success: false, message: 'API Password not set for this user' });
        }

        const match = await bcrypt.compare(password, user.api_password);
        if (!match) {
            return res.status(401).json({ success: false, message: 'Invalid API credentials' });
        }

        const userId = user.id;

        // Parse numbers
        let contacts = [];
        if (typeof numbers === 'string') {
            contacts = numbers.split(',').map(n => n.trim()).filter(Boolean);
        } else if (Array.isArray(numbers)) {
            contacts = numbers;
        }

        if (contacts.length === 0) {
            return res.status(400).json({ success: false, message: 'No valid numbers provided' });
        }

        const cName = campaignName || `API_WA_${Date.now()}`;
        const campaignId = `CAMP_API_${Math.floor(Math.random() * 10000)}_${Date.now()}`;

        // Create campaign
        await query(
            `INSERT INTO campaigns (id, user_id, name, channel, template_id, template_name, recipient_count, sent_count, failed_count, status, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 'running', NOW())`,
            [campaignId, userId, cName, 'whatsapp', templateName, templateName, contacts.length]
        );

        const values = contacts.map(mobile => {
            const cleanMobile = typeof mobile === 'string' ? mobile.replace(/\D/g, '') : String(mobile).replace(/\D/g, '');
            if (!cleanMobile) return null;
            return [campaignId, userId, cleanMobile, 'pending'];
        }).filter(Boolean);

        if (values.length > 0) {
            const BATCH = 1000;
            for (let i = 0; i < values.length; i += BATCH) {
                await query('INSERT INTO campaign_queue (campaign_id, user_id, mobile, status) VALUES ?', [values.slice(i, i + BATCH)]);
            }
        }

        // Deduct credits
        const { deductCampaignCredits } = require('../services/walletService');
        const deductionResult = await deductCampaignCredits(campaignId);

        if (!deductionResult.success) {
            console.error(`❌ API Credit deduction failed for WA campaign ${campaignId}: ${deductionResult.message}`);
            await query('UPDATE campaigns SET status = "failed" WHERE id = ?', [campaignId]);
            return res.status(402).json({ success: false, message: deductionResult.message || 'Insufficient wallet balance' });
        }

        return res.json({
            success: true,
            message: 'Campaign accepted for processing',
            campaignId,
            queued: contacts.length
        });

    } catch (error) {
        console.error('❌ External API WhatsApp campaign send error:', error.message);
        res.status(500).json({ success: false, message: 'Internal server error while processing API request' });
    }
});

module.exports = router;

