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
 * Professional Developer Portal for WhatsApp API
 */
router.get('/docs', (req, res) => {
    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>API Documentation | NotifyNow</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
        <style>
            :root {
                --primary: #2563eb;
                --emerald: #10b981;
                --bg: #f8fafc;
                --text: #0f172a;
                --muted: #64748b;
                --border: #e2e8f0;
                --code: #0f172a;
            }

            * { margin: 0; padding: 0; box-sizing: border-box; -webkit-font-smoothing: antialiased; }
            body { font-family: 'Inter', sans-serif; background: var(--bg); color: var(--text); overflow-x: hidden; font-size: 14px; }
            
            /* Responsive Container */
            .wrapper { display: flex; flex-direction: column; min-height: 100vh; }
            @min-width: 1024px { .wrapper { flex-direction: row; } }

            /* Desktop Sidebar */
            aside { width: 100%; border-bottom: 1px solid var(--border); background: #1e293b; color: white; padding: 20px; position: sticky; top: 0; z-index: 100; }
            @media (min-width: 1024px) { 
                aside { width: 280px; height: 100vh; border-bottom: none; border-right: 1px solid rgba(255,255,255,0.1); position: sticky; top: 0; padding: 40px 25px; } 
            }

            .logo { font-size: 1.25rem; font-weight: 800; display: flex; align-items: center; gap: 10px; color: white; text-decoration: none; margin-bottom: 0; }
            @media (min-width: 1024px) { .logo { margin-bottom: 50px; } }
            .logo i { color: #22c55e; }

            .nav-menu { display: none; }
            @media (min-width: 1024px) { 
                .nav-menu { display: block; }
                .nav-item { display: block; padding: 10px 15px; color: #94a3b8; text-decoration: none; border-radius: 8px; margin-bottom: 4px; transition: 0.2s; font-size: 0.9rem; font-weight: 500; }
                .nav-item:hover { background: rgba(255,255,255,0.05); color: white; }
                .nav-item.active { background: var(--primary); color: white; }
            }

            /* Main Content Area */
            main { flex: 1; padding: 30px 20px; max-width: 1000px; margin: 0 auto; width: 100%; }
            @media (min-width: 768px) { main { padding: 60px 40px; } }

            /* Header Section */
            header { margin-bottom: 40px; }
            .badge { display: inline-block; background: #e0f2fe; color: #0369a1; padding: 4px 12px; border-radius: 99px; font-weight: 700; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }
            h1 { font-size: 2.2rem; letter-spacing: -0.02em; font-weight: 800; color: #1e293b; margin-bottom: 12px; line-height: 1.1; }
            .subtitle { font-size: 1rem; color: var(--muted); line-height: 1.5; font-weight: 400; max-width: 600px; }

            /* Steps Implementation */
            .steps-container { display: grid; grid-template-columns: 1fr; gap: 15px; margin: 40px 0; }
            @media (min-width: 640px) { .steps-container { grid-template-columns: repeat(2, 1fr); } }
            @media (min-width: 900px) { .steps-container { grid-template-columns: repeat(4, 1fr); } }

            .step { background: white; border: 1px solid var(--border); padding: 20px; border-radius: 12px; position: relative; display: flex; flex-direction: column; align-items: center; text-align: center; }
            .step-icon { width: 40px; height: 40px; background: #eff6ff; color: var(--primary); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; margin-bottom: 15px; }
            .step-arrow { display: none; position: absolute; top: 35px; right: -10px; color: #cbd5e1; z-index: 2; }
            @media (min-width: 900px) { .step-arrow { display: block; } .step:last-child .step-arrow { display: none; } }
            .step b { display: block; font-size: 0.85rem; margin-bottom: 4px; color: var(--text); }
            .step p { font-size: 0.75rem; color: var(--muted); }

            /* Modern Cards */
            .card { background: white; border: 1px solid var(--border); border-radius: 16px; padding: 25px; margin-bottom: 30px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
            @media (min-width: 768px) { .card { padding: 35px; } }
            
            h2 { font-size: 1.4rem; font-weight: 700; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; color: #1e293b; }
            h2 i { font-size: 1rem; color: var(--primary); }

            /* Endpoint Logic */
            .api-info { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 15px; margin-bottom: 20px; }
            .method-pill { display: inline-block; background: #059669; color: white; padding: 3px 10px; border-radius: 6px; font-weight: 800; font-size: 0.75rem; font-family: 'JetBrains Mono'; margin-right: 12px; }
            .url { font-family: 'JetBrains Mono', monospace; font-size: 0.85rem; color: #334155; word-break: break-all; }

            /* Code Snippet Area */
            .editor { background: var(--code); border-radius: 12px; overflow: hidden; margin-top: 15px; }
            .editor-header { background: #1e293b; padding: 10px 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155; }
            .editor-label { font-size: 0.7rem; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
            .copy-btn { background: rgba(255,255,255,0.05); border: 1px solid #334155; color: #cbd5e1; padding: 5px 12px; border-radius: 6px; font-size: 0.7rem; cursor: pointer; transition: 0.2s; font-weight: 600; }
            .copy-btn:hover { background: white; color: black; }
            pre { padding: 20px; font-family: 'JetBrains Mono', monospace; font-size: 0.82rem; color: #94a3b8; overflow-x: auto; line-height: 1.7; }
            .val-str { color: #a5f3fc; }
            .val-num { color: #fdba74; }

            /* Download Bar */
            .download-wrapper { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 20px; }
            .btn-action { text-decoration: none; padding: 10px 20px; border-radius: 8px; font-size: 0.85rem; font-weight: 600; display: inline-flex; align-items: center; gap: 8px; transition: 0.2s; }
            .btn-primary { background: var(--primary); color: white; }
            .btn-primary:hover { background: #1d4ed8; transform: translateY(-1px); }
            .btn-outline { border: 1px solid var(--border); color: var(--text); background: white; }
            .btn-outline:hover { background: #f8fafc; border-color: var(--primary); }

            /* Table responsive */
            .table-scroll { overflow-x: auto; margin: 15px 0; }
            table { width: 100%; border-collapse: collapse; min-width: 500px; }
            th { text-align: left; background: #f8fafc; padding: 12px 15px; font-size: 0.75rem; color: var(--muted); border-bottom: 1px solid var(--border); text-transform: uppercase; font-weight: 600; }
            td { padding: 14px 15px; font-size: 0.85rem; border-bottom: 1px solid var(--border); }
            .p-name { font-weight: 600; font-family: 'JetBrains Mono'; color: #e11d48; font-size: 0.8rem; }

            /* Footer */
            footer { text-align: center; padding: 50px 0; border-top: 1px solid var(--border); margin-top: 40px; color: var(--muted); font-size: 0.8rem; }
        </style>
    </head>
    <body>
        <div class="wrapper">
            <aside>
                <a href="#" class="logo"><i class="fab fa-whatsapp"></i> NotifyNow</a>
                <nav class="nav-menu">
                    <a href="#welcome" class="nav-item active">Overview</a>
                    <a href="#quickstart" class="nav-item">Quick Start</a>
                    <a href="#endpoints" class="nav-item">API Endpoints</a>
                    <a href="#mapping" class="nav-item">Variables Guide</a>
                </nav>
            </aside>

            <main>
                <header id="welcome">
                    <span class="badge">Stable v3.4</span>
                    <h1>Developer Service Hub</h1>
                    <p class="subtitle">A lightweight, high-speed API for sending WhatsApp messages globally. Integrated with <b>Direct Meta Routing</b> for sub-second delivery.</p>
                </header>

                <div class="card" id="quickstart">
                    <h2><i class="fas fa-rocket"></i> 4-Step Implementation</h2>
                    <div class="steps-container">
                        <div class="step">
                            <div class="step-icon"><i class="fas fa-user-shield"></i></div>
                            <b>1. Auth Credentials</b>
                            <p>Get your API Password from Profile Settings.</p>
                            <i class="fas fa-chevron-right step-arrow"></i>
                        </div>
                        <div class="step">
                            <div class="step-icon"><i class="fas fa-file-code"></i></div>
                            <b>2. Choose API</b>
                            <p>Use Bulk for Ads, Single for OTP / Alerts.</p>
                            <i class="fas fa-chevron-right step-arrow"></i>
                        </div>
                        <div class="step">
                            <div class="step-icon"><i class="fas fa-terminal"></i></div>
                            <b>3. Load Payload</b>
                            <p>Map your dynamic {{1}} variables in JSON.</p>
                            <i class="fas fa-chevron-right step-arrow"></i>
                        </div>
                        <div class="step">
                            <div class="step-icon"><i class="fas fa-check-double"></i></div>
                            <b>4. Deploy & Fly</b>
                            <p>Scale to millions of users instantly.</p>
                        </div>
                    </div>
                    
                    <div class="download-wrapper">
                        <a href="/api/whatsapp/download-postman" class="btn-action btn-primary"><i class="fas fa-cloud-download-alt"></i> Download Postman Collection</a>
                        <a href="#endpoints" class="btn-action btn-outline">Explore Endpoints <i class="fas fa-arrow-down" style="font-size: 10px;"></i></a>
                    </div>
                </div>

                <div id="endpoints">
                    <h2><i class="fas fa-database"></i> Core API Endpoints</h2>
                    
                    <!-- Bulk API -->
                    <div class="card">
                        <h3 style="font-size: 1rem; margin-bottom: 12px;">Dynamic Campaigns</h3>
                        <p style="font-size: 0.85rem; color: var(--muted); margin-bottom: 15px;">Ideal for marketing with unique names/links per contact.</p>
                        <div class="api-info">
                            <span class="method-pill">POST</span>
                            <span class="url">https://developer.notifynow.in/api/whatsapp/api/send-bulk</span>
                        </div>
                        <div class="editor">
                            <div class="editor-header"><span class="editor-label">JSON Payload</span> <button class="copy-btn" onclick="copyCode('bulkArea')">COPY</button></div>
                            <pre id="bulkArea">{
  <span class="val-str">"username"</span>: <span class="val-str">"demo@gmail.com"</span>,
  <span class="val-str">"password"</span>: <span class="val-str">"api_pass_123"</span>,
  <span class="val-str">"templateName"</span>: <span class="val-str">"marketing_v3"</span>,
  <span class="val-str">"numbers"</span>: [
    {
      <span class="val-str">"to"</span>: <span class="val-str">"919004207813"</span>,
      <span class="val-str">"variables"</span>: { <span class="val-str">"1"</span>: <span class="val-str">"Sandeep"</span>, <span class="val-str">"2"</span>: <span class="val-str">"Flat 30% OFF"</span> },
      <span class="val-str">"mediaUrl"</span>: <span class="val-str">"https://cdn.link/img.jpg"</span>
    }
  ]
}</pre>
                        </div>
                    </div>

                    <!-- Single API -->
                    <div class="card">
                        <h3 style="font-size: 1rem; margin-bottom: 12px;">Instant Transactional</h3>
                        <p style="font-size: 0.85rem; color: var(--muted); margin-bottom: 15px;">Low-latency service for OTPs, 2FA, and live alerts.</p>
                        <div class="api-info">
                            <span class="method-pill">POST</span>
                            <span class="url">https://developer.notifynow.in/api/whatsapp/api/send-single</span>
                        </div>
                        <div class="editor">
                            <div class="editor-header"><span class="editor-label">JSON Payload</span> <button class="copy-btn" onclick="copyCode('singleArea')">COPY</button></div>
                            <pre id="singleArea">{
  <span class="val-str">"username"</span>: <span class="val-str">"demo@gmail.com"</span>,
  <span class="val-str">"password"</span>: <span class="val-str">"api_pass_123"</span>,
  <span class="val-str">"to"</span>: <span class="val-str">"919004207813"</span>,
  <span class="val-str">"templateName"</span>: <span class="val-str">"otp_notify"</span>,
  <span class="val-str">"variables"</span>: { <span class="val-str">"1"</span>: <span class="val-str">"452091"</span> }
}</pre>
                        </div>
                    </div>
                </div>

                <div class="card" id="mapping">
                    <h2><i class="fas fa-link"></i> Variable Mapping Guide</h2>
                    <p style="font-size: 0.85rem; color: var(--muted); margin-bottom: 20px;">Use the <b>Body Variables</b> defined in your Meta Template Manager.</p>
                    <div class="table-scroll">
                        <table>
                            <thead>
                                <tr><th>Placeholder</th><th>Direction</th><th>JSON Key</th></tr>
                            </thead>
                            <tbody>
                                <tr><td><code>{{1}}</code></td><td><i class="fas fa-arrow-right" style="font-size: 10px; color: #94a3b8;"></i></td><td><code class="p-name">"1"</code></td></tr>
                                <tr><td><code>{{2}}</code></td><td><i class="fas fa-arrow-right" style="font-size: 10px; color: #94a3b8;"></i></td><td><code class="p-name">"2"</code></td></tr>
                                <tr><td>Header Image</td><td><i class="fas fa-arrow-right" style="font-size: 10px; color: #94a3b8;"></i></td><td><code class="p-name">"mediaUrl"</code></td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <footer>
                    <p>&copy; 2026 NotifyNow Solutions &bull; Developer Network</p>
                    <p style="margin-top: 5px;">Enterprise Messaging Powered by Cell24x7</p>
                </footer>
            </main>
        </div>

        <script>
            function copyCode(id) {
                const text = document.getElementById(id).innerText;
                navigator.clipboard.writeText(text);
                const btn = event.target;
                const oldText = btn.innerText;
                btn.innerText = 'COPIED';
                btn.style.color = '#10b981';
                setTimeout(() => { btn.innerText = oldText; btn.style.color = ''; }, 2000);
            }

            // Simple Nav Tracking
            window.addEventListener('scroll', () => {
                let fromTop = window.scrollY + 100;
                document.querySelectorAll('.nav-item').forEach(link => {
                    let section = document.querySelector(link.hash);
                    if (section.offsetTop <= fromTop && section.offsetTop + section.offsetHeight > fromTop) {
                        link.classList.add('active');
                    } else {
                        link.classList.remove('active');
                    }
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

