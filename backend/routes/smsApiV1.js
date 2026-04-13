const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { sendSMS } = require('../utils/smsService');
const { deductSingleMessageCredit } = require('../services/walletService');

/**
 * Enhanced Authentication Middleware: Support Headers, Query, and Body
 */
const authenticateApiKey = async (req, res, next) => {
    const params = { ...req.query, ...req.body };
    const apiKey = req.headers['x-api-key'] || params.apiKey || params.apikey;
    const username = params.user || params.username;
    const password = params.pwd || params.password;

    try {
        let userRecord = null;

        if (apiKey) {
            const [users] = await query('SELECT id, name, company, role, status FROM users WHERE api_key = ?', [apiKey]);
            if (users.length > 0) userRecord = users[0];
        } else if (username && password) {
            const bcrypt = require('bcryptjs');
            const [users] = await query('SELECT id, name, company, role, status, api_password FROM users WHERE email = ? OR contact_phone = ?', [username, username]);
            if (users.length > 0) {
                const match = await bcrypt.compare(password, users[0].api_password || "");
                if (match) {
                    const { api_password, ...safeUser } = users[0];
                    userRecord = safeUser;
                }
            }
        }

        if (!userRecord) {
            return res.status(401).json({ success: false, message: 'Invalid Credentials (apiKey or user/pwd required)' });
        }

        if (userRecord.status !== 'active' && userRecord.status !== 'pending') {
            return res.status(403).json({ success: false, message: `Account is ${userRecord.status}` });
        }

        req.user = userRecord;
        next();
    } catch (err) {
        console.error('API Key Auth Error:', err);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

/**
 * Handle Single SMS Send (Optimized for DLT Auto-Detection)
 */
const handleSendSms = async (req, res) => {
    // Support both camelCase and snake_case for common DLT parameters
    const params = { ...req.query, ...req.body };
    const mobile = params.mobile || params.to || params.phone;
    const message = params.message || params.msg || params.text;
    
    // DLT Specific IDs
    let templateId = params.templateId || params.template_id || params.dlt_template_id || params.temp_id;
    let senderId = params.senderId || params.sender_id || params.sender || params.from;
    let peId = params.peId || params.pe_id;
    let hashId = params.hashId || params.hash_id;

    if (!mobile) {
        return res.status(400).json({ success: false, message: 'Mobile number is required (mobile or to)' });
    }

    if (!message && !templateId) {
        return res.status(400).json({ success: false, message: 'Message content or a valid templateId is required' });
    }

    try {
        let finalMessage = message;
        let finalTemplateId = templateId || '';
        let finalSenderId = senderId || '';
        let finalPeId = peId || '';
        let finalHashId = hashId || '';
        let templateResolved = false;

        // 1. Resolve Template Metadata from Database if templateId is provided
        if (templateId) {
            // Check user's message_templates first
            const [msgTmpl] = await query(
                'SELECT name, body, metadata FROM message_templates WHERE (id = ? OR name = ?) AND user_id = ? LIMIT 1',
                [templateId, templateId, req.user.id]
            );

            if (msgTmpl.length > 0) {
                const tmpl = msgTmpl[0];
                if (!finalMessage) finalMessage = tmpl.body;
                
                try {
                    const meta = typeof tmpl.metadata === 'string' ? JSON.parse(tmpl.metadata) : (tmpl.metadata || {});
                    finalTemplateId = meta.templateId || meta.dlt_template_id || finalTemplateId;
                    finalPeId = meta.peId || meta.pe_id || finalPeId;
                    finalHashId = meta.hashId || meta.hash_id || finalHashId;
                    templateResolved = true;
                } catch (e) {
                    console.warn('[SMS-API] Meta parse failed for templateId:', templateId);
                }
            } else {
                // Check global dlt_templates if not found in personal templates
                const [dltTmpl] = await query(
                    'SELECT temp_id, pe_id, hash_id, temp_name FROM dlt_templates WHERE (temp_id = ? OR temp_name = ?) LIMIT 1',
                    [templateId, templateId]
                );
                
                if (dltTmpl.length > 0) {
                    finalTemplateId = dltTmpl[0].temp_id;
                    finalPeId = dltTmpl[0].pe_id || finalPeId;
                    finalHashId = dltTmpl[0].hash_id || finalHashId;
                    templateResolved = true;
                }
            }
        } 
        
        // 1b. AUTO-DETECTION: If no templateId provided, try matching message body against DLT records
        if (!templateResolved && finalMessage) {
            console.log(`[SMS-API] Auto-detecting template for: "${finalMessage.substring(0, 30)}..."`);
            
            // Fetch both user templates and global DLT templates for matching
            const [userTmpls] = await query('SELECT name, body, metadata FROM message_templates WHERE user_id = ?', [req.user.id]);
            const [dltTmpls] = await query('SELECT temp_id, pe_id, hash_id, body FROM dlt_templates');
            
            const allTmpls = [
                ...userTmpls.map(t => ({ ...t, source: 'user' })),
                ...dltTmpls.map(t => ({ ...t, name: t.temp_id, source: 'dlt' }))
            ];

            for (const tmpl of allTmpls) {
                if (!tmpl.body) continue;
                
                let regexBody = tmpl.body.trim();
                // Replace variables with wildcards: {#...#}, {{...}}, {...}, %...%
                regexBody = regexBody.replace(/\{#[^#]+#\}|\{\{[^}]+\}\}|\{[^}]+\}|%[^%]+%|\[[^\]]+\]/g, '___WILDCARD___');
                // Escape special regex chars
                regexBody = regexBody.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                // Make punctuation/whitespace flexible
                regexBody = regexBody.replace(/[^A-Za-z0-9_\\s]/g, '[\\s\\W]*');
                // Restore wildcards
                regexBody = regexBody.replace(/___WILDCARD___/g, '.*');
                
                const matcher = new RegExp(`^${regexBody}$`, 's');
                
                if (matcher.test(finalMessage.trim())) {
                    console.log(`[SMS-API] Match found in ${tmpl.source} templates: ${tmpl.name || tmpl.temp_id}`);
                    
                    if (tmpl.source === 'user') {
                        try {
                            const meta = typeof tmpl.metadata === 'string' ? JSON.parse(tmpl.metadata) : (tmpl.metadata || {});
                            finalTemplateId = meta.templateId || meta.dlt_template_id;
                            finalPeId = meta.peId || meta.pe_id;
                            finalHashId = meta.hashId || meta.hash_id;
                        } catch (e) {}
                    } else {
                        finalTemplateId = tmpl.temp_id;
                        finalPeId = tmpl.pe_id;
                        finalHashId = tmpl.hash_id;
                    }

                    if (finalTemplateId) {
                        templateResolved = true;
                        break;
                    }
                }
            }
        }

        // 2. Final Guard: In India, TemplateId and PEID are mandatory for DLT gateways
        if (!finalTemplateId || !finalPeId) {
            console.warn(`[SMS-API] Send attempted without DLT metadata. Resolving might have failed.`);
            // We still proceed, but the gateway might reject it.
        }

        // 3. Credit Check & Deduction
        const creditResult = await deductSingleMessageCredit(req.user.id, 'sms', finalTemplateId || 'Direct API');
        if (!creditResult.success) {
            return res.status(402).json({ success: false, message: creditResult.message });
        }

        // 4. Dispatch SMS
        // Enforce HTTP for SMS callbacks (Kannel/Gateways often do not follow HTTPS redirects)
        const baseUrl = (process.env.API_BASE_URL || 'http://notifynow.in').replace('https://', 'http://');
        const callbackUrl = `${baseUrl}/api/webhooks/sms/callback`;
        console.log(`[SMS-API] Generated Callback URL: ${callbackUrl}`);
        
        const smsResult = await sendSMS(mobile, finalMessage, {
            userId: req.user.id,
            templateId: finalTemplateId,
            sender: finalSenderId,
            peId: finalPeId,
            hashId: finalHashId,
            callbackUrl: callbackUrl
        });
        
        if (!smsResult.success) {
            return res.status(502).json({ 
                success: false, 
                message: 'Gateway Rejection: ' + smsResult.error,
                details: 'Ensure your message matches the DLT template exactly and provides valid Template ID.'
            });
        }

        // 5. Log to API usage
        const finalMsgId = smsResult.messageId;
        await query(
            'INSERT INTO api_message_logs (user_id, campaign_id, campaign_name, template_name, message_id, recipient, status, send_time, channel) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?)',
            [req.user.id, 'API_V1', 'Direct SMS API', finalTemplateId || 'Direct SMS', finalMsgId, mobile, 'sent', 'SMS']
        );

        res.json({
            success: true,
            message: 'SMS sent successfully',
            messageId: finalMsgId,
            metadata: {
                resolvedTemplateId: finalTemplateId,
                resolvedPeId: finalPeId,
                autoDetected: templateResolved
            },
            providerResponse: smsResult.response
        });

    } catch (err) {
        console.error('SMS API v1 error:', err);
        res.status(500).json({ success: false, message: 'Internal Server Error: ' + err.message });
    }
};

router.get('/send', authenticateApiKey, handleSendSms);
router.post('/send', authenticateApiKey, handleSendSms);

// Diagnostic Tools for Developers
router.get('/debug-templates', authenticateApiKey, async (req, res) => {
    try {
        const [templates] = await query('SELECT id, name, body, metadata FROM message_templates WHERE user_id = ?', [req.user.id]);
        const [dltTemplates] = await query('SELECT temp_id, pe_id, hash_id, temp_name, body FROM dlt_templates LIMIT 50');
        res.json({ success: true, user_id: req.user.id, user_templates: templates, global_dlt_templates_sample: dltTemplates });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;

