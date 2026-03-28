/**
 * WhatsApp Routes — Universal (Meta Graph API + Pinbot/Pinnacle)
 * Automatically routes to correct API based on user's provider config
 */

const express = require('express');
const axios = require('axios');
const { query } = require('../config/db');
const authenticate = require('../middleware/authMiddleware');
const { deductSingleMessageCredit, deductCampaignCredits } = require('../services/walletService');

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
        // Fix for ENAMETOOLONG: Truncate and sanitize originalname
        const safeName = file.originalname.replace(/[^a-z0-9.]/gi, '_').substring(0, 50);
        cb(null, `wa_${Date.now()}_${safeName}`);
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
        
        // Meta/Pinbot requirement: Media headers and variable body text MUST have an example/sample
        const processedComponents = components.map(comp => {
            const normalizedComp = { ...comp };
            
            // Normalize for our internal check
            const typeUC = (normalizedComp.type || '').toUpperCase();
            const formatUC = (normalizedComp.format || '').toUpperCase();

            // Pinbot V3 manual shows lowercase for these fields. 
            if (config.isPinbot) {
                if (normalizedComp.type) normalizedComp.type = normalizedComp.type.toLowerCase();
                if (normalizedComp.format) normalizedComp.format = normalizedComp.format.toLowerCase();
            } else {
                if (normalizedComp.type) normalizedComp.type = normalizedComp.type.toUpperCase();
                if (normalizedComp.format) normalizedComp.format = normalizedComp.format.toUpperCase();
            }
            
            // 1. Handle Header Examples
            if (typeUC === 'HEADER' && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(formatUC)) {
                if (!normalizedComp.example || (!normalizedComp.example.header_handle && !normalizedComp.example.header_text)) {
                    console.warn(`[WA-TEMPLATE] ⚠️ HEADER ${formatUC} missing required example. Adding placeholder.`);
                    // We can't easily auto-gen a handle, but usually UI provides it.
                }
            }

            // 2. Handle Body Examples (CRITICAL fix for variables like {{1}})
            if (typeUC === 'BODY' && normalizedComp.text && normalizedComp.text.includes('{{')) {
                if (!normalizedComp.example || !normalizedComp.example.body_text) {
                    const matches = normalizedComp.text.match(/{{(\d+)}}/g);
                    if (matches) {
                        const count = matches.length;
                        console.log(`[WA-TEMPLATE] 🛠️ Auto-generating examples for ${count} variables in BODY`);
                        normalizedComp.example = {
                            body_text: [
                                matches.map((_, i) => `SampleValue ${i+1}`)
                            ]
                        };
                    }
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

        // Credit Validation
        const templateName = payload.template?.name || 'unknown';
        const deduction = await deductSingleMessageCredit(req.user.id, 'whatsapp', templateName);
        if (!deduction.success) {
            return res.status(402).json({ success: false, message: deduction.message || 'Insufficient wallet balance' });
        }

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

        // Credit Validation
        const deduction = await deductSingleMessageCredit(req.user.id, 'whatsapp', templateName);
        if (!deduction.success) {
            return res.status(402).json({ success: false, message: deduction.message || 'Insufficient wallet balance' });
        }

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
                campaignId = `CAMP${Date.now()}`;
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
                    // Added 'channel' column for compatibility with worker reporting engine
                    await query('INSERT INTO campaign_queue (campaign_id, user_id, mobile, status, channel) VALUES ?', [values.slice(i, i + BATCH).map(v => [...v, 'whatsapp'])]);
                }
                console.log(`✅ Queued ${values.length} contacts for WhatsApp campaign ${campaignId}`);
            }
        } else if (!campaignId) {
            return res.status(400).json({ success: false, message: 'No contacts provided and no campaign ID' });
        }

        // Set campaign running & deduct credits
        if (campaignId) {
            await query('UPDATE campaigns SET status = "running" WHERE id = ? AND user_id = ?', [campaignId, userId]);

            const deductionResult = await deductCampaignCredits(campaignId);
            if (!deductionResult.success) {
                console.error(`❌ Credit deduction failed for WA campaign ${campaignId}: ${deductionResult.message}`);
                await query('UPDATE campaigns SET status = "paused" WHERE id = ?', [campaignId]);
                return res.status(402).json({ success: false, message: deductionResult.message || 'Insufficient wallet balance' });
            }

            // Trigger Queue processing IMMEDIATELY instead of waiting for 15s loop
            const { processQueue } = require('../services/queueService');
            processQueue().catch(err => console.error('WA Queue Trigger Error:', err.message));

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
        
        if (!users.length) {
            return res.status(401).json({ success: false, message: 'Invalid API credentials: User not found' });
        }
        
        if (!users[0].api_password) {
            return res.status(401).json({ success: false, message: 'Invalid API credentials: API Password not set in profile' });
        }

        if (!(await bcrypt.compare(password, users[0].api_password))) {
            return res.status(401).json({ success: false, message: 'Invalid API credentials: Password mismatch' });
        }

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

        // Create Campaign initially as checking_credits in api_campaigns
        await query(
            `INSERT INTO api_campaigns (id, user_id, name, channel, template_id, template_name, recipient_count, audience_count, status, template_metadata, template_body)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'checking_credits', ?, ?)`,
            [campaignId, userId, cName, 'whatsapp', templateName, templateName, contacts.length, contacts.length, template?.metadata, template?.body]
        );

        // Perform Credit Check
        const { deductCampaignCredits } = require('../services/walletService');
        const deductionResult = await deductCampaignCredits(campaignId, 'api_campaigns');
        
        if (!deductionResult.success) {
            console.warn(`[Bulk API] Insufficient credits for user ${userId}. Campaign: ${campaignId}`);
            await query('UPDATE api_campaigns SET status = "paused" WHERE id = ?', [campaignId]);
            return res.status(402).json({ 
                success: false, 
                message: deductionResult.message || 'Insufficient wallet balance' 
            });
        }

        // Only insert into queue after successful deduction
        const queueValues = contacts.map(c => {
            const vars = { ...(variables || {}), ...(c.variables || {}) };
            if (c.mediaUrl || mediaUrl) vars['header_url'] = c.mediaUrl || mediaUrl;
            return [campaignId, userId, c.to.replace(/\D/g, ''), 'pending', JSON.stringify(vars)];
        });

        const BATCH = 1000;
        for (let i = 0; i < queueValues.length; i += BATCH) {
            await query('INSERT INTO api_campaign_queue (campaign_id, user_id, mobile, status, variables) VALUES ?', [queueValues.slice(i, i + BATCH)]);
        }

        // Mark as running in api_campaigns so worker processes it
        await query('UPDATE api_campaigns SET status = "running" WHERE id = ?', [campaignId]);

        // Trigger Queue processing IMMEDIATELY
        const { processApiQueue } = require('../services/queueService');
        processApiQueue().catch(err => console.error('WA API Queue Trigger Error:', err.message));

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

        const { deductSingleMessageCredit } = require('../services/walletService');
        const deduction = await deductSingleMessageCredit(user.id, 'whatsapp', templateName);
        
        if (!deduction.success) {
            return res.status(402).json({ success: false, message: deduction.message || 'Insufficient wallet balance' });
        }

        const response = await axios.post(getMessagesUrl(config), payload, { headers: getHeaders(config) });
        const messageId = response.data.messages?.[0]?.id || response.data.message_id;

        // Log to api_message_logs
        await query(
            'INSERT INTO api_message_logs (user_id, campaign_id, campaign_name, template_name, message_id, recipient, status, send_time, channel, message_content) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?)',
            [user.id, 'API_SINGLE_WA', 'Direct WhatsApp API', templateName, messageId, to, 'sent', 'whatsapp', `Template: ${templateName}`]
        );

        res.json({ success: true, messageId });
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

        // 1. Check if it's a Campaign (Manual or API)
        if (id.startsWith('CAMP_')) {
            const [camps] = await query(`
                SELECT * FROM (
                    SELECT id, name, status, recipient_count, sent_count, failed_count, created_at FROM campaigns WHERE id = ? AND user_id = ?
                    UNION ALL
                    SELECT id, name, status, recipient_count, audience_count as recipient_count, sent_count, failed_count, created_at FROM api_campaigns WHERE id = ? AND user_id = ?
                ) as combined_camps
            `, [id, userId, id, userId]);
            if (camps.length) return res.json({ success: true, type: 'campaign', data: camps[0] });
        }

        // 2. Check if it's a Single Message (Manual or API)
        const [logs] = await query(`
            SELECT * FROM (
                SELECT * FROM message_logs WHERE (message_id = ? OR id = ?) AND user_id = ?
                UNION ALL
                SELECT * FROM api_message_logs WHERE (message_id = ? OR id = ?) AND user_id = ?
            ) as combined_logs
        `, [id, id, userId, id, id, userId]);
        if (logs.length) return res.json({ success: true, type: 'message', data: logs[0] });

        res.status(404).json({ success: false, message: 'Record not found' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/whatsapp/docs
 * Modern Pro Developer Hub for WhatsApp API
 */
router.get('/docs', (req, res) => {
    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Developer Portal | WhatsApp API</title>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
        <style>
            :root {
                --primary: #2563eb;
                --primary-soft: #eff6ff;
                --emerald: #10b981;
                --bg: #ffffff;
                --sidebar-bg: #f8fafc;
                --text-main: #0f172a;
                --text-muted: #64748b;
                --border: #f1f5f9;
                --code-bg: #0f172a;
                --card-shadow: 0 10px 30px -10px rgba(0,0,0,0.08);
            }

            * { margin: 0; padding: 0; box-sizing: border-box; -webkit-font-smoothing: antialiased; scroll-behavior: smooth; }
            body { font-family: 'Plus Jakarta Sans', sans-serif; background: var(--bg); color: var(--text-main); font-size: 14px; overflow-x: hidden; }

            /* Grid Layout */
            .app-container { display: flex; min-height: 100vh; }

            /* Sticky Sidebar */
            aside { 
                width: 280px; 
                background: var(--sidebar-bg); 
                border-right: 1px solid var(--border); 
                position: fixed; 
                height: 100vh; 
                padding: 40px 24px; 
                display: flex; 
                flex-direction: column;
                z-index: 1000;
                transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }

            .logo-area { display: flex; align-items: center; gap: 12px; font-weight: 800; font-size: 1.25rem; color: #1e293b; margin-bottom: 48px; text-decoration: none; }
            .logo-area i { font-size: 1.5rem; color: var(--emerald); }

            .nav-section { margin-bottom: 32px; }
            .nav-label { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.1em; margin-bottom: 12px; display: block; }
            .nav-link { 
                display: flex; align-items: center; gap: 10px; padding: 12px 16px; 
                color: var(--text-muted); text-decoration: none; border-radius: 12px; 
                font-weight: 600; transition: 0.2s; margin-bottom: 4px;
            }
            .nav-link:hover { background: var(--primary-soft); color: var(--primary); }
            .nav-link.active { background: white; color: var(--primary); box-shadow: 0 4px 12px rgba(0,0,0,0.05); }

            /* Main Area */
            main { flex: 1; margin-left: 280px; padding: 60px 80px; max-width: 1200px; width: 100%; }

            /* Header UI */
            header { margin-bottom: 64px; }
            .badge { background: #dcfce7; color: #15803d; padding: 6px 14px; border-radius: 99px; font-weight: 700; font-size: 0.7rem; margin-bottom: 16px; display: inline-block; text-transform: uppercase; }
            h1 { font-size: 2.75rem; font-weight: 800; letter-spacing: -0.03em; color: #1e293b; margin-bottom: 16px; }
            .hero-desc { font-size: 1.15rem; color: var(--text-muted); max-width: 700px; line-height: 1.7; }

            /* Implementation Workflow Steps */
            .workflow { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; margin-bottom: 80px; }
            .workflow-step { background: #fdfdfe; border: 1px solid var(--border); padding: 32px 24px; border-radius: 20px; transition: 0.3s ease; box-shadow: var(--card-shadow); border-bottom: 3px solid transparent; }
            .workflow-step:hover { transform: translateY(-5px); border-bottom-color: var(--primary); }
            .step-idx { width: 40px; height: 40px; background: var(--primary-soft); color: var(--primary); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 1rem; margin-bottom: 20px; }
            .workflow-step h4 { font-size: 1rem; font-weight: 700; margin-bottom: 10px; color: #1e293b; }
            .workflow-step p { font-size: 0.85rem; color: var(--text-muted); line-height: 1.6; }

            /* API Cards */
            .card { background: white; border: 1px solid var(--border); border-radius: 24px; padding: 48px; margin-bottom: 48px; box-shadow: var(--card-shadow); }
            .card-title { font-size: 1.5rem; font-weight: 800; display: flex; align-items: center; gap: 14px; margin-bottom: 24px; color: #1e293b; }
            .card-title i { color: var(--primary); }

            /* Endpoint Logic */
            .endpoint-bar { display: flex; align-items: center; gap: 16px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 14px 24px; border-radius: 14px; margin-bottom: 32px; }
            .method { background: var(--emerald); color: white; padding: 5px 14px; border-radius: 10px; font-weight: 800; font-size: 0.8rem; font-family: 'JetBrains Mono'; }
            .method.get { background: var(--primary); }
            .url-text { font-family: 'JetBrains Mono', monospace; font-size: 0.95rem; color: #475569; }

            /* Code Component */
            .code-box { background: var(--code-bg); border-radius: 18px; overflow: hidden; }
            .code-header { background: rgba(255,255,255,0.03); padding: 14px 24px; border-bottom: 1px solid rgba(255,255,255,0.08); display: flex; justify-content: space-between; align-items: center; }
            .code-lang { font-size: 0.75rem; color: #64748b; font-weight: 700; text-transform: uppercase; }
            .copy-btn { background: rgba(255,255,255,0.03); border: 1px solid #334155; color: #94a3b8; padding: 7px 16px; border-radius: 10px; cursor: pointer; font-size: 0.75rem; font-weight: 700; transition: 0.2s; }
            .copy-btn:hover { background: white; color: black; border-color: white; }
            pre { padding: 32px; font-family: 'JetBrains Mono', monospace; font-size: 0.95rem; line-height: 1.8; color: #cbd5e1; overflow-x: auto; }

            /* Responsive Hamburger Menu */
            .mobile-header { display: none; padding: 20px 24px; background: white; border-bottom: 1px solid var(--border); position: sticky; top: 0; z-index: 1100; align-items: center; justify-content: space-between; box-shadow: 0 2px 10px rgba(0,0,0,0.02); }
            .menu-toggle { font-size: 1.75rem; color: var(--text-main); cursor: pointer; }

            @media (max-width: 1024px) {
                aside { transform: translateX(-100%); width: 280px; }
                aside.open { transform: translateX(0); box-shadow: 20px 0 60px rgba(0,0,0,0.15); }
                main { margin-left: 0; padding: 48px 24px; }
                .mobile-header { display: flex; }
                .workflow { grid-template-columns: 1fr; gap: 20px; }
                header { margin-bottom: 40px; }
                h1 { font-size: 2.25rem; }
                .card { padding: 32px 24px; }
            }

            .btn-cta { display: inline-flex; align-items: center; gap: 12px; background: var(--primary); color: white; padding: 16px 32px; border-radius: 14px; font-weight: 700; text-decoration: none; transition: 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); border: none; cursor: pointer; box-shadow: 0 10px 25px -5px rgba(37, 99, 235, 0.4); font-size: 0.95rem; }
            .btn-cta:hover { transform: scale(1.02) translateY(-2px); box-shadow: 0 15px 35px -5px rgba(37, 99, 235, 0.5); }

            footer { border-top: 1px solid var(--border); margin-top: 100px; padding: 60px 0; text-align: center; color: var(--text-muted); font-size: 0.9rem; font-weight: 500; }
        </style>
    </head>
    <body>
        <div class="mobile-header">
            <a href="#" class="logo-area" style="margin-bottom:0;"><i class="fab fa-whatsapp"></i> NotifyNow</a>
            <div class="menu-toggle" id="menuBtn"><i class="fas fa-bars"></i></div>
        </div>

        <div class="app-container">
            <aside id="sidebar">
                <a href="#" class="logo-area" style="color:var(--primary);"><i class="fab fa-whatsapp"></i> NotifyNow Hub</a>
                <div class="nav-section">
                    <span class="nav-label">Resources</span>
                    <a href="#intro" class="nav-link active"><i class="fas fa-book-open"></i> API Overview</a>
                    <a href="#steps" class="nav-link"><i class="fas fa-layer-group"></i> Implementation</a>
                </div>
                <div class="nav-section">
                    <span class="nav-label">Endpoints</span>
                    <a href="#bulk" class="nav-link"><i class="fas fa-mail-bulk"></i> WhatsApp Bulk</a>
                    <a href="#single" class="nav-link"><i class="fas fa-bolt"></i> WhatsApp Single</a>
                    <a href="#rcs-bulk" class="nav-link"><i class="fas fa-comment-dots"></i> RCS Bulk</a>
                    <a href="#rcs-single" class="nav-link"><i class="fas fa-paper-plane"></i> RCS Single</a>
                    <a href="#mapping" class="nav-link"><i class="fas fa-sliders-h"></i> Param Mapping</a>
                </div>
                <div style="margin-top:auto; padding-top:20px;">
                    <button class="btn-cta" style="width:100%; justify-content:center;" onclick="downloadPostman()">
                        <i class="fas fa-file-download"></i> Postman Docs
                    </button>
                </div>
            </aside>

            <main>
                <header id="intro">
                    <span class="badge">Enterprise Ready v3.0</span>
                    <h1>WhatsApp Developer Dashboard</h1>
                    <p class="hero-desc">Integrate world-class messaging into your application in minutes. Our high-concurrency API handles everything from marketing bursts to critical OTP delivery.</p>
                </header>

                <h3 style="font-size:1.5rem; font-weight:800; margin-bottom:32px; color:#1e293b;" id="steps">How to Integrate</h3>
                <div class="workflow">
                    <div class="workflow-step">
                        <div class="step-idx">1</div>
                        <h4>Authentication</h4>
                        <p>Retrieve your secret <b>API Password</b> from the Profile settings panel.</p>
                    </div>
                    <div class="workflow-step">
                        <div class="step-idx">2</div>
                        <h4>Design Template</h4>
                        <p>Create your WhatsApp template in Meta Manager and get its ID.</p>
                    </div>
                    <div class="workflow-step">
                        <div class="step-idx">3</div>
                        <h4>Submit Payload</h4>
                        <p>Post the recipient numbers and dynamic variables to our secure endpoints.</p>
                    </div>
                    <div class="workflow-step">
                        <div class="step-idx">4</div>
                        <h4>Track Success</h4>
                        <p>Monitor real-time delivery status and logs via the tracking API.</p>
                    </div>
                </div>

                <!-- Bulk API -->
                <div class="card" id="bulk">
                    <div class="card-title"><i class="fas fa-users"></i> Bulk Dynamic Campaign API</div>
                    <p style="color:var(--text-muted); margin-bottom:32px; line-height:1.7;">Perfect for high-volume broadcasts where each user receives personalized content (e.g. customized names, unique coupon codes, or dynamic document links).</p>
                    <div class="endpoint-bar">
                        <span class="method">POST</span>
                        <span class="url-text">https://developer.notifynow.in/api/whatsapp/api/send-bulk</span>
                    </div>
                    <div class="code-box">
                        <div class="code-header"><span class="code-lang">JavaScript / JSON</span> <button class="copy-btn" onclick="copyCode('bulkCode')">COPY CODE</button></div>
                        <pre id="bulkCode">{
  "username": "demo@gmail.com",
  "password": "your_api_password",
  "templateName": "promo_campaign_2024",
  "campaignName": "Spring Sale Burst",
  "numbers": [
    {
      "to": "919004207813",
      "variables": { "1": "Sandeep", "2": "SALE50" },
      "mediaUrl": "https://assets.yoursite.com/coupon.png"
    }
  ]
}</pre>
                    </div>
                </div>

                <!-- Single API -->
                <div class="card" id="single">
                    <div class="card-title"><i class="fas fa-bolt"></i> WhatsApp Instant Dispatch (Single)</div>
                    <p style="color:var(--text-muted); margin-bottom:32px; line-height:1.7;">Optimized for millisecond delivery. Use this for time-critical notifications like Login OTPs, Payment confirmations, and Order updates.</p>
                    <div class="endpoint-bar">
                        <span class="method">POST</span>
                        <span class="url-text">https://notifynow.in/api/whatsapp/api/send-single</span>
                    </div>
                    <div class="code-box">
                        <div class="code-header"><span class="code-lang">JavaScript / JSON</span> <button class="copy-btn" onclick="copyCode('singleCode')">COPY CODE</button></div>
                        <pre id="singleCode">{
  "username": "demo@gmail.com",
  "password": "your_api_password",
  "to": "919004207813",
  "templateName": "transaction_otp",
  "variables": { "1": "992105" }
}</pre>
                    </div>
                </div>

                <!-- RCS Bulk API -->
                <div class="card" id="rcs-bulk">
                    <div class="card-title"><i class="fas fa-comment-dots"></i> RCS Bulk Dynamic Campaign</div>
                    <p style="color:var(--text-muted); margin-bottom:32px; line-height:1.7;">Enterprise-grade RCS rich messaging API. Supports images, carousels, and interactive buttons with higher delivery rates than SMS.</p>
                    <div class="endpoint-bar">
                        <span class="method">POST</span>
                        <span class="url-text">https://notifynow.in/api/rcs/api/send-bulk</span>
                    </div>
                    <div class="code-box">
                        <div class="code-header"><span class="code-lang">JavaScript / JSON</span> <button class="copy-btn" onclick="copyCode('rcsBulkCode')">COPY CODE</button></div>
                        <pre id="rcsBulkCode">{
  "username": "demo@gmail.com",
  "password": "your_api_password",
  "templateName": "rcs_promo_v1",
  "campaignName": "Spring Sale RCS",
  "numbers": [ "919004207813", "919876543210" ]
}</pre>
                    </div>
                </div>

                <!-- RCS Single API -->
                <div class="card" id="rcs-single">
                    <div class="card-title"><i class="fas fa-paper-plane"></i> RCS Instant Dispatch (Single)</div>
                    <p style="color:var(--text-muted); margin-bottom:32px; line-height:1.7;">Direct peer-to-peer RCS messaging API for transactional alerts.</p>
                    <div class="endpoint-bar">
                        <span class="method">POST</span>
                        <span class="url-text">https://notifynow.in/api/rcs/api/send-single</span>
                    </div>
                    <div class="code-box">
                        <div class="code-header"><span class="code-lang">JavaScript / JSON</span> <button class="copy-btn" onclick="copyCode('rcsSingleCode')">COPY CODE</button></div>
                        <pre id="rcsSingleCode">{
  "username": "demo@gmail.com",
  "password": "your_api_password",
  "to": "919004207813",
  "templateName": "welcome_rcs",
  "params": ["Sandeep"]
}</pre>
                    </div>
                </div>

                <footer>
                    <p>&copy; 2026 NotifyNow Platform. All rights reserved.</p>
                    <p style="margin-top: 8px; color:#cbd5e1;">Infrastructure managed by Cell24x7 Enterprise Services</p>
                </footer>
            </main>
        </div>

        <script>
            // Improved Mobile Menu handling
            const menuBtn = document.getElementById('menuBtn');
            const sidebar = document.getElementById('sidebar');
            menuBtn.addEventListener('click', () => {
                sidebar.classList.toggle('open');
                menuBtn.querySelector('i').classList.toggle('fa-bars');
                menuBtn.querySelector('i').classList.toggle('fa-times');
            });

            // Close sidebar when link is clicked on mobile
            document.querySelectorAll('.nav-link').forEach(link => {
                link.addEventListener('click', () => {
                    if (window.innerWidth <= 1024) {
                        sidebar.classList.remove('open');
                        menuBtn.querySelector('i').classList.add('fa-bars');
                        menuBtn.querySelector('i').classList.remove('fa-times');
                    }
                });
            });

            function copyCode(id) {
                const text = document.getElementById(id).innerText;
                navigator.clipboard.writeText(text);
                const btn = event.target;
                btn.innerText = 'COPIED!';
                setTimeout(() => btn.innerText = 'COPY CODE', 2000);
            }

            function downloadPostman() {
                window.location.href = '/api/whatsapp/download-postman';
            }

            // High-performance scroll tracking
            window.addEventListener('scroll', () => {
                const sections = document.querySelectorAll('main > div[id], main > header[id], main > h3[id]');
                const navLinks = document.querySelectorAll('.nav-link');
                let cur = '';

                sections.forEach(section => {
                    const top = section.offsetTop;
                    if (pageYOffset >= top - 120) cur = section.getAttribute('id');
                });

                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href').substring(1) === cur) link.classList.add('active');
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
    const filePath = path.join(__dirname, '../../notifynow_developer_api.json');
    res.download(filePath, 'NotifyNow_WhatsApp_API.json');
});

module.exports = router;

