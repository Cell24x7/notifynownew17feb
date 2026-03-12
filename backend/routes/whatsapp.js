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

        // Meta requirement: Lowercase and underscores only
        const sanitizedName = name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
        
        // Meta/Pinbot requirement: Media headers MUST have an example/sample
        const processedComponents = components.map(comp => {
            const normalizedComp = { ...comp };
            
            // Normalize for our internal check
            const typeUC = (normalizedComp.type || '').toUpperCase();
            const formatUC = (normalizedComp.format || '').toUpperCase();

            // Pinbot V3 manual shows lowercase for these fields. 
            // Meta usually accepts both, but let's follow the provider's V3 manual exactly.
            if (config.isPinbot) {
                if (normalizedComp.type) normalizedComp.type = normalizedComp.type.toLowerCase();
                if (normalizedComp.format) normalizedComp.format = normalizedComp.format.toLowerCase();
            } else {
                if (normalizedComp.type) normalizedComp.type = normalizedComp.type.toUpperCase();
                if (normalizedComp.format) normalizedComp.format = normalizedComp.format.toUpperCase();
            }
            
            if (typeUC === 'HEADER' && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(formatUC)) {
                if (!normalizedComp.example || !normalizedComp.example.header_handle) {
                    console.warn(`[WA-TEMPLATE] ⚠️ HEADER ${formatUC} might be missing required example handle.`);
                }
            }
            return normalizedComp;
        });

        const payload = { 
            name: sanitizedName, 
            category, 
            language, 
            components: processedComponents,
            allow_category_change: allow_category_change !== undefined ? allow_category_change : true 
        };

        // Meta/Pinbot are strict about component fields. Strip our internal helper fields.
        const metaPayload = {
            ...payload,
            components: payload.components.map(c => {
                const { file_url, previewUrl, ...rest } = c;
                return rest;
            })
        };

        console.log(`[WA-TEMPLATE] Creating template: ${sanitizedName}`);
        console.log(`[WA-TEMPLATE] Payload Sent to Provider: ${JSON.stringify(metaPayload, null, 2)}`);
        
        const response = await axios.post(getTemplatesUrl(config), metaPayload, {
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
        form.append('file', req.file.buffer, {
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

        // If Pinbot user, use the Resumable Upload (Session) flow to get a proper Meta Handle (4::...)
        // This is strictly required for WhatsApp Message Templates.
        if (config && config.isPinbot) {
            console.log(`[WA-UPLOAD] Pinbot user detected. Initiating session-based upload for template handle.`);
            
            try {
                // Step 1: Create Upload Session
                const sessionRes = await axios.post(`${PINBOT_BASE}/app/uploads`, null, {
                    headers: { apikey: config.api_key },
                    params: {
                        file_length: req.file.size,
                        file_type: req.file.mimetype
                    }
                });

                if (sessionRes.data && sessionRes.data.id) {
                    const sessionId = sessionRes.data.id;
                    const sig = sessionRes.data.sig;
                    console.log(`[WA-UPLOAD] Session created: ${sessionId}`);

                    const fs = require('fs');
                    const fileData = fs.readFileSync(req.file.path);

                    // Step 2: Binary Upload to Session
                    let uploadUrl = `${PINBOT_BASE}/${sessionId}`;
                    if (sig) {
                        uploadUrl += (uploadUrl.includes('?') ? '&' : '?') + `sig=${sig}`;
                    }

                    console.log(`[WA-UPLOAD] >>> BINARY UPLOAD START >>> to: ${uploadUrl}`);

                    const uploadRes = await axios.post(uploadUrl, fileData, {
                        headers: { 
                            apikey: config.api_key, 
                            'Content-Type': req.file.mimetype,
                            'Content-Length': fileData.length,
                            'file_offset': 0
                        }
                    });

                    if (uploadRes.data && (uploadRes.data.h || uploadRes.data.handle || uploadRes.data.id)) {
                        const handle = uploadRes.data.h || uploadRes.data.handle || uploadRes.data.id;
                        
                        const protocol = req.protocol === 'https' ? 'https' : (req.get('x-forwarded-proto') || req.protocol);
                        const host = req.get('host');
                        // Use the API proxy route to ensure Nginx/Express serve it correctly with MIME type
                        const fileUrl = `${protocol}://${host}/api/whatsapp/media-file/${req.file.filename}`;
                        
                        console.log('✅ [WA-UPLOAD] SUCCESS! Handle obtained and proxy URL generated:', handle);
                        return res.json({ success: true, url: fileUrl, handle: handle, isHandle: true });
                    }
                }
                
                throw new Error('Pinbot session upload succeeded but no handle was returned.');
            } catch (proxyErr) {
                const pinError = proxyErr.response?.data || proxyErr.message;
                console.error('[WA-UPLOAD] ❌ Pinbot Upload Failed:', JSON.stringify(pinError, null, 2));
                return res.status(500).json({ 
                    success: false, 
                    message: 'Failed to upload media to WhatsApp. Please check your Pinbot/WABA configuration.',
                    error: pinError
                });
            }
        }

        const protocol = req.protocol === 'https' ? 'https' : (req.get('x-forwarded-proto') || req.protocol);
        const host = req.get('host');
        const fileUrl = `${protocol}://${host}/api/whatsapp/media-file/${req.file.filename}`;
        
        console.log(`[WA-UPLOAD] Local upload (non-Pinbot) via proxy: ${fileUrl}`);
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
// MEDIA FILE PROXY
// ─────────────────────────────────────────────

/**
 * GET /api/whatsapp/media-file/:filename
 * Proxy route to serve local media files with correct Content-Type.
 * This ensures Nginx/SPA fallback issues are bypassed.
 */
router.get('/media-file/:filename', async (req, res) => {
    try {
        const filename = path.basename(req.params.filename); // Sanitize
        const filePath = path.join(__dirname, '..', 'uploads', 'whatsapp_media', filename);
        
        if (fs.existsSync(filePath)) {
            const ext = path.extname(filePath).toLowerCase();
            const mimeMap = {
                '.png': 'image/png',
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.pdf': 'application/pdf',
                '.mp4': 'video/mp4'
            };
            res.setHeader('Content-Type', mimeMap[ext] || 'application/octet-stream');
            res.setHeader('Cache-Control', 'public, max-age=86400'); // 24 hours
            return fs.createReadStream(filePath).pipe(res);
        }
        
        console.error(`[WA-MEDIA-PROXY] File not found: ${filePath}`);
        res.status(404).json({ success: false, message: 'Media file not found' });
    } catch (err) {
        console.error(`[WA-MEDIA-PROXY] Fatal error:`, err);
        res.status(500).json({ success: false, message: err.message });
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
 * POST /api/whatsapp/api/send-bulk
 * Dynamic Bulk API: Best for large campaigns with variables/media
 */
router.post('/api/send-bulk', async (req, res) => {
    try {
        const { username, password, numbers, campaignName, templateName, mediaUrl, variables } = req.body;

        if (!username || !password || !templateName || !numbers) {
            return res.status(400).json({ success: false, message: 'Missing required fields: username, password, templateName, numbers' });
        }

        // Auth
        const bcrypt = require('bcryptjs');
        const [users] = await query('SELECT * FROM users WHERE email = ?', [username]);
        if (!users.length || !users[0].api_password) return res.status(401).json({ success: false, message: 'Invalid API credentials' });
        if (!(await bcrypt.compare(password, users[0].api_password))) return res.status(401).json({ success: false, message: 'Invalid API credentials' });

        const user = users[0];
        const userId = user.id;

        // Fetch Template
        const [temps] = await query('SELECT * FROM message_templates WHERE name = ? AND user_id = ?', [templateName, userId]);
        const template = temps[0];

        // Parse numbers
        let contacts = [];
        if (typeof numbers === 'string') contacts = numbers.split(',').map(n => ({ to: n.trim() }));
        else if (Array.isArray(numbers)) contacts = numbers.map(n => typeof n === 'string' ? { to: n } : n);
        contacts = contacts.filter(c => c.to);

        const cName = campaignName || `BULK_API_${Date.now()}`;
        const campaignId = `CAMP_API_${Date.now()}`;

        // Create Campaign
        await query(
            `INSERT INTO campaigns (id, user_id, name, channel, template_id, template_name, recipient_count, status, template_metadata, template_body)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'running', ?, ?)`,
            [campaignId, userId, cName, 'whatsapp', templateName, templateName, contacts.length, template?.metadata, template?.body]
        );

        // Queue
        const queueValues = contacts.map(c => {
            const vars = { ...(variables || {}), ...(c.variables || {}) };
            if (c.mediaUrl || mediaUrl) vars['header_url'] = c.mediaUrl || mediaUrl;
            return [campaignId, userId, c.to.replace(/\D/g, ''), 'pending', JSON.stringify(vars)];
        });

        const BATCH = 1000;
        for (let i = 0; i < queueValues.length; i += BATCH) {
            await query('INSERT INTO campaign_queue (campaign_id, user_id, mobile, status, variables) VALUES ?', [queueValues.slice(i, i + BATCH)]);
        }

        const { deductCampaignCredits } = require('../services/walletService');
        await deductCampaignCredits(campaignId);

        res.json({ success: true, campaignId, queued: contacts.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/whatsapp/api/send-single
 * Simple Message API: Best for instant OTPs, Alerts, or Single Notifications
 */
router.post('/api/send-single', async (req, res) => {
    try {
        const { username, password, to, templateName, variables, mediaUrl } = req.body;

        if (!username || !password || !templateName || !to) {
            return res.status(400).json({ success: false, message: 'Missing required fields: username, password, templateName, to' });
        }

        // Auth
        const bcrypt = require('bcryptjs');
        const [users] = await query('SELECT * FROM users WHERE email = ?', [username]);
        if (!users.length || !users[0].api_password) return res.status(401).json({ success: false, message: 'Invalid API credentials' });
        if (!(await bcrypt.compare(password, users[0].api_password))) return res.status(401).json({ success: false, message: 'Invalid API credentials' });

        const user = users[0];
        const config = await getWhatsAppConfig(user.id);
        if (!config) return res.status(400).json({ success: false, message: 'WhatsApp not configured for this user' });

        // Build Payload
        const payload = {
            messaging_product: 'whatsapp',
            to: to.replace(/\D/g, ''),
            type: 'template',
            template: {
                name: templateName,
                language: { code: 'en_US' }
            }
        };

        // Add variables if any
        if (variables || mediaUrl) {
            const components = [];
            if (mediaUrl) {
                components.push({
                    type: 'header',
                    parameters: [{ type: 'image', image: { link: mediaUrl } }]
                });
            }
            if (variables) {
                const params = Object.keys(variables).sort((a,b) => a-b).map(key => ({ type: 'text', text: String(variables[key]) }));
                components.push({ type: 'body', parameters: params });
            }
            payload.template.components = components;
        }

        const response = await axios.post(getMessagesUrl(config), payload, { headers: getHeaders(config) });
        res.json({ success: true, messageId: response.data.messages?.[0]?.id || response.data.message_id });
    } catch (error) {
        res.status(500).json({ success: false, error: error.response?.data || error.message });
    }
});

/**
 * GET /api/whatsapp/api/status/:id
 * Public Status API: Check status of a Bulk Campaign or Single Message
 */
router.get('/api/status/:id', async (req, res) => {
    try {
        const { username, password } = req.query;
        const id = req.params.id;

        if (!username || !password) return res.status(401).json({ success: false, message: 'Auth required' });

        // Simple Auth
        const bcrypt = require('bcryptjs');
        const [users] = await query('SELECT * FROM users WHERE email = ?', [username]);
        if (!users.length || !(await bcrypt.compare(password, users[0].api_password))) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const userId = users[0].id;

        // 1. Check if it's a Campaign
        if (id.startsWith('CAMP_')) {
            const [camps] = await query('SELECT id, name, status, recipient_count, sent_count, failed_count, created_at FROM campaigns WHERE id = ? AND user_id = ?', [id, userId]);
            if (camps.length) return res.json({ success: true, type: 'campaign', data: camps[0] });
        }

        // 2. Check if it's a Single Message
        const [logs] = await query('SELECT * FROM message_logs WHERE (message_id = ? OR id = ?) AND user_id = ?', [id, id, userId]);
        if (logs.length) return res.json({ success: true, type: 'message', data: logs[0] });

        res.status(404).json({ success: false, message: 'Record not found' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/whatsapp/docs
 * Premium Browser-Accessible Documentation for WhatsApp API
 */
router.get('/docs', (req, res) => {
    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>WhatsApp Developer Portal | NotifyNow</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
        <style>
            :root {
                --primary: #2563eb;
                --primary-dark: #1d4ed8;
                --accent: #0ea5e9;
                --bg: #f8fafc;
                --card-bg: #ffffff;
                --text-main: #0f172a;
                --text-muted: #64748b;
                --code-bg: #0f172a;
                --border: #e2e8f0;
            }

            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Inter', sans-serif; background-color: var(--bg); color: var(--text-main); line-height: 1.6; }

            /* Grid Layout */
            .layout { display: grid; grid-template-columns: 280px 1fr; min-height: 100vh; }
            
            /* Sidebar */
            aside { background: #1e293b; color: white; padding: 40px 20px; position: sticky; top: 0; height: 100vh; border-right: 1px solid rgba(255,255,255,0.1); }
            .logo { font-size: 1.5rem; font-weight: 800; margin-bottom: 40px; display: flex; align-items: center; gap: 10px; color: white; text-decoration: none; }
            .logo i { color: #22c55e; }
            .nav-link { display: block; padding: 12px 15px; color: #94a3b8; text-decoration: none; border-radius: 8px; margin-bottom: 5px; transition: all 0.2s; font-size: 0.95rem; }
            .nav-link:hover { background: rgba(255,255,255,0.05); color: white; }
            .nav-link.active { background: var(--primary); color: white; font-weight: 600; }

            /* Main Content */
            main { padding: 60px 80px; max-width: 1200px; }
            header { margin-bottom: 60px; display: flex; justify-content: space-between; align-items: flex-start; }
            .badge-live { background: #dcfce7; color: #16a34a; padding: 4px 12px; border-radius: 99px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; margin-bottom: 10px; display: inline-block; }
            
            /* Typography */
            h1 { font-size: 2.75rem; font-weight: 800; letter-spacing: -0.02em; margin-bottom: 15px; color: #1e293b; }
            .desc { font-size: 1.15rem; color: var(--text-muted); max-width: 700px; }
            h2 { font-size: 1.75rem; font-weight: 700; margin: 50px 0 25px; display: flex; align-items: center; gap: 12px; }
            h2 i { color: var(--primary); font-size: 1.25rem; }

            /* Buttons */
            .btn-download { background: var(--primary); color: white; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: 600; display: inline-flex; align-items: center; gap: 10px; transition: all 0.3s; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.3); border: none; cursor: pointer; }
            .btn-download:hover { background: var(--primary-dark); transform: translateY(-2px); box-shadow: 0 6px 20px rgba(37, 99, 235, 0.4); }

            /* Cards */
            .card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 16px; padding: 35px; margin-bottom: 30px; transition: transform 0.2s; }
            .card:hover { border-color: var(--primary); }
            
            /* Endpoint Styles */
            .endpoint { background: #f1f5f9; padding: 15px 20px; border-radius: 10px; font-family: 'JetBrains Mono', monospace; font-size: 0.95rem; display: flex; align-items: center; gap: 15px; margin-bottom: 25px; border-left: 4px solid var(--primary); }
            .m-post { color: #059669; font-weight: 800; }
            .m-get { color: #2563eb; font-weight: 800; }

            /* Code Blocks */
            .code-header { background: #334155; color: #cbd5e1; padding: 10px 20px; border-radius: 12px 12px 0 0; display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem; font-weight: 600; }
            .copy-btn { background: none; border: 1px solid #475569; color: #cbd5e1; padding: 4px 10px; border-radius: 4px; cursor: pointer; transition: 0.2s; }
            .copy-btn:hover { background: white; color: black; }
            pre { background: var(--code-bg); color: #e2e8f0; padding: 25px; border-radius: 0 0 12px 12px; overflow-x: auto; font-family: 'JetBrains Mono', monospace; font-size: 0.92rem; border: 1px solid #334155; border-top: none; }
            
            /* Table */
            table { width: 100%; border-collapse: separate; border-spacing: 0; margin: 20px 0; border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
            th { background: #f8fafc; text-align: left; padding: 15px 20px; font-weight: 600; color: #475569; }
            td { padding: 15px 20px; border-top: 1px solid var(--border); }
            code.param { background: #ffedd5; color: #9a3412; padding: 3px 8px; border-radius: 6px; font-size: 0.85rem; font-weight: 600; }

            @media (max-width: 1024px) { 
                .layout { grid-template-columns: 1fr; } 
                aside { display: none; }
                main { padding: 40px 30px; }
            }
        </style>
    </head>
    <body>
        <div class="layout">
            <aside>
                <a href="#" class="logo"><i class="fab fa-whatsapp"></i> NotifyNow</a>
                <nav>
                    <a href="#intro" class="nav-link active">Getting Started</a>
                    <a href="#auth" class="nav-link">Authentication</a>
                    <a href="#bulk" class="nav-link">Bulk Message API</a>
                    <a href="#single" class="nav-link">Single Message API</a>
                    <a href="#status" class="nav-link">Status Tracking</a>
                </nav>
            </aside>

            <main>
                <header>
                    <div id="intro">
                        <span class="badge-live">API Version 3.4.0</span>
                        <h1>WhatsApp Developer API</h1>
                        <p class="desc">Build powerful messaging experiences using our high-performance WhatsApp Business API. Send personalized campaigns, OTPs, and media in seconds.</p>
                    </div>
                    <button class="btn-download" onclick="downloadPostman()">
                        <i class="fas fa-cloud-download-alt"></i> Download Postman Collection
                    </button>
                </header>

                <div class="card" id="auth">
                    <h2><i class="fas fa-key"></i> Authentication</h2>
                    <p>All requests must include your account credentials. Authenticate your API calls using your registered email and your unique <b>API Password</b>.</p>
                    <table>
                        <thead>
                            <tr><th>Parameter</th><th>Type</th><th>Description</th></tr>
                        </thead>
                        <tbody>
                            <tr><td><code class="param">username</code></td><td>String</td><td>Your NotifyNow account email or phone number.</td></tr>
                            <tr><td><code class="param">password</code></td><td>String</td><td>Your secret <b>API Password</b> from the dashboard.</td></tr>
                        </tbody>
                    </table>
                </div>

                <h2 id="bulk"><i class="fas fa-layer-group"></i> 1. Bulk Messaging API</h2>
                <div class="card">
                    <p>Use this endpoint for large marketing campaigns. It supports dynamic variables and unique media links for every single recipient.</p>
                    <div class="endpoint">
                        <span class="m-post">POST</span> https://developer.notifynow.in/api/whatsapp/api/send-bulk
                    </div>
                    
                    <div class="code-header">REQUEST PAYLOAD <button class="copy-btn" onclick="copyCode('bulkCode')">COPY</button></div>
                    <pre id="bulkCode">{
  "username": "demo@gmail.com",
  "password": "your_api_password",
  "templateName": "marketing_v3",
  "campaignName": "Spring Sale 2024",
  "numbers": [
    {
      "to": "919004207813",
      "variables": { "1": "Sandeep", "2": "20% OFF" },
      "mediaUrl": "https://yoursite.com/img1.jpg"
    }
  ]
}</pre>
                </div>

                <h2 id="single"><i class="fas fa-bolt"></i> 2. Single Message API (Fast)</h2>
                <div class="card">
                    <p>Optimized for low-latency delivery. Perfect for OTPs, 2FA, and critical transaction alerts.</p>
                    <div class="endpoint">
                        <span class="m-post">POST</span> https://developer.notifynow.in/api/whatsapp/api/send-single
                    </div>
                    
                    <div class="code-header">REQUEST PAYLOAD <button class="copy-btn" onclick="copyCode('singleCode')">COPY</button></div>
                    <pre id="singleCode">{
  "username": "demo@gmail.com",
  "password": "your_api_password",
  "to": "919004207813",
  "templateName": "otp_verification",
  "variables": { "1": "482091" }
}</pre>
                </div>

                <h2 id="status"><i class="fas fa-search"></i> 3. Status & Tracking</h2>
                <div class="card">
                    <p>Track the delivery lifecycle of your campaigns. Returns sent count, failed count, and delivery timing.</p>
                    <div class="endpoint">
                        <span class="m-get">GET</span> /api/whatsapp/api/status/{id}
                    </div>
                    
                    <div class="code-header">CURL EXAMPLE <button class="copy-btn" onclick="copyCode('statusBtn')">COPY</button></div>
                    <pre id="statusBtn">curl --location --request GET 'https://developer.notifynow.in/api/whatsapp/api/status/CAMP_123?username=demo@gmail.com&password=pass'</pre>
                </div>

                <div class="footer">
                    <p>&copy; 2026 NotifyNow Solutions. All rights reserved.</p>
                    <p style="margin-top: 10px; font-size: 0.8rem;">Powered by Cell24x7 Infrastructure</p>
                </div>
            </main>
        </div>

        <script>
            function copyCode(id) {
                const text = document.getElementById(id).innerText;
                navigator.clipboard.writeText(text);
                const btn = event.target;
                const oldText = btn.innerText;
                btn.innerText = 'COPIED!';
                btn.style.background = '#22c55e';
                btn.style.color = 'white';
                setTimeout(() => {
                    btn.innerText = oldText;
                    btn.style.background = '';
                    btn.style.color = '';
                }, 2000);
            }

            function downloadPostman() {
                window.location.href = '/api/whatsapp/download-postman';
            }

            // Sync Nav highlights on scroll
            window.addEventListener('scroll', () => {
                let current = "";
                document.querySelectorAll('div[id], h2[id], div[id]').forEach((section) => {
                    const sectionTop = section.offsetTop;
                    if (pageYOffset >= sectionTop - 100) { current = section.getAttribute("id"); }
                });
                document.querySelectorAll('.nav-link').forEach((li) => {
                    li.classList.remove("active");
                    if (li.getAttribute("href").includes(current)) { li.classList.add("active"); }
                });
            });
        </script>
    </body>
    </html>
    `;
    res.send(html);
});

/**
 * GET /api/whatsapp/download-postman
 * Download the pre-configured Postman Collection
 */
router.get('/download-postman', (req, res) => {
    const filePath = path.join(__dirname, '../../Partners_API_V3_Postman_Collection.postman_collection.json');
    res.download(filePath, 'NotifyNow_WhatsApp_API.json');
});

module.exports = router;

