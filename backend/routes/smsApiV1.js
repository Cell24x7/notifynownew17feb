const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { sendSMS } = require('../utils/smsService');
const { deductSingleMessageCredit } = require('../services/walletService');

/**
 * Enhanced Authentication Middleware: Support Headers, Query, and Body
 */
const authenticateApiKey = async (req, res, next) => {
    const apiKey = req.headers['x-api-key'] || req.query.apiKey || req.body.apiKey;

    if (!apiKey) {
        console.warn(`[API-AUTH] Rejected: No API Key provided at ${req.method} ${req.url}`);
        return res.status(401).json({ success: false, message: 'API Key is required.' });
    }

    try {
        const [users] = await query('SELECT id, name, company, role, status FROM users WHERE api_key = ?', [apiKey]);
        
        if (users.length === 0) {
            console.warn(`[API-AUTH] Invalid Key: ${apiKey.substring(0, 8)}...`);
            return res.status(403).json({ success: false, message: 'Invalid API Key' });
        }

        if (users[0].status !== 'active' && users[0].status !== 'pending') {
            console.warn(`[API-AUTH] Inactive User: ${users[0].name} (Status: ${users[0].status})`);
            return res.status(403).json({ success: false, message: `Account is ${users[0].status}` });
        }

        console.log(`[API-AUTH] Success: ${users[0].name} authenticated via key.`);
        req.user = users[0];
        next();
    } catch (err) {
        console.error('API Key Auth CRITICAL Error:', err);
        res.status(500).json({ success: false, message: 'Internal Server Error during Authentication' });
    }
};

/**
 * Optimized endpoint to handle template resolution and automatic metadata fetching
 */
const handleSendSms = async (req, res) => {
    const { mobile, message, templateId, senderId, peId, hashId } = { ...req.query, ...req.body };

    if (!mobile) {
        return res.status(400).json({ success: false, message: 'Mobile number is required' });
    }

    try {
        let finalMessage = message;
        let finalTemplateId = templateId || '';
        let finalPeId = peId || '';
        let finalHashId = hashId || '';
        let templateResolved = false;

        // 1. Resolve Template Metadata from Database if templateId/name is provided
        if (templateId) {
            // Check message_templates first
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
                    console.log(`[SMS-API] Resolved metadata from message_templates for "${templateId}"`);
                } catch (e) {
                    console.warn('[SMS-API] Failed to parse template metadata');
                }
            } else {
                // Check dlt_templates if not found in message_templates
                const [dltTmpl] = await query(
                    'SELECT temp_id, pe_id, hash_id FROM dlt_templates WHERE (temp_id = ? OR temp_name = ?) LIMIT 1',
                    [templateId, templateId]
                );
                
                if (dltTmpl.length > 0) {
                    const dlt = dltTmpl[0];
                    finalTemplateId = dlt.temp_id;
                    finalPeId = dlt.pe_id || finalPeId;
                    finalHashId = dlt.hash_id || finalHashId;
                    templateResolved = true;
                    console.log(`[SMS-API] Resolved metadata from dlt_templates for "${templateId}"`);
                }
            }
        } 
        // 1b. AUTO-DETECTION: If no templateId provided, try matching message body against user templates
        else if (finalMessage && !templateId) {
            console.log(`[SMS-API] DEBUG: Attempting auto-detection for user ${req.user.id}. Message: "${finalMessage.substring(0, 30)}..."`);
            const [userTemplates] = await query(
                'SELECT id, name, body, metadata FROM message_templates WHERE user_id = ?',
                [req.user.id]
            );
            
            console.log(`[SMS-API] DEBUG: Found ${userTemplates.length} templates for user ${req.user.id}`);

            for (const tmpl of userTemplates) {
                if (!tmpl.body) continue;
                
                // --- SMART ROBUST MATCHING ---
                let regexStr = tmpl.body.trim();
                // Mask all variable types
                regexStr = regexStr.replace(/\{#[^#]+#\}|\{\{[^}]+\}\}|\{[^}]+\}|%[^%]+%|\[[^\]]+\]/g, '___WILDCARD___');
                // Escape regex
                regexStr = regexStr.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                // Punctuation and whitespace agnostic
                regexStr = regexStr.replace(/[^A-Za-z0-9_\\s]/g, '[\\s\\W]*');
                // Wildcards
                regexStr = regexStr.replace(/___WILDCARD___/g, '.*');
                
                const matcher = new RegExp(`^${regexStr}$`, 's');
                
                if (matcher.test(finalMessage.trim())) {
                    console.log(`[SMS-API] ✅ MATCH FOUND: "${tmpl.name}"`);
                    try {
                        let meta = {};
                        try {
                            meta = typeof tmpl.metadata === 'string' ? JSON.parse(tmpl.metadata) : (tmpl.metadata || {});
                        } catch (e) { meta = {}; }

                        finalTemplateId = meta.templateId || meta.dlt_template_id;
                        finalPeId = meta.peId || meta.pe_id;
                        finalHashId = meta.hashId || meta.hash_id;

                        // --- DEEP DLT LOOKUP FALLBACK ---
                        if (!finalTemplateId || !finalPeId) {
                            console.log(`[SMS-API] ⚠️ IDs missing in metadata for "${tmpl.name}", checking dlt_templates table...`);
                            const [dltRows] = await query(
                                'SELECT temp_id, pe_id, hash_id FROM dlt_templates WHERE temp_name = ? OR temp_id = ? LIMIT 1',
                                [tmpl.name, finalTemplateId || tmpl.id]
                            );
                            
                            if (dltRows.length > 0) {
                                finalTemplateId = dltRows[0].temp_id || finalTemplateId;
                                finalPeId = dltRows[0].pe_id || finalPeId;
                                finalHashId = dltRows[0].hash_id || finalHashId;
                                console.log(`[SMS-API] 🎯 Found DLT IDs from dlt_templates: ${finalTemplateId}`);
                            }
                        }

                        if (finalTemplateId) {
                            templateResolved = true;
                            console.log(`[SMS-API] 🚀 Resolved Final IDs: Template=${finalTemplateId}, PE=${finalPeId}`);
                            break;
                        }
                    } catch (e) {
                        console.error('[SMS-API] Error during resolution:', e.message);
                    }
                }
            }
            
            if (!templateResolved) {
                console.log(`[SMS-API] ❌ No template matched for user ${req.user.id}`);
            }
        }

        if (!finalMessage) {
            return res.status(400).json({ success: false, message: 'Message content is required or valid templateId not found' });
        }

        // 2. Credit Check & Deduction
        const creditResult = await deductSingleMessageCredit(req.user.id, 'sms', templateId || 'Direct API');
        if (!creditResult.success) {
            return res.status(402).json({ success: false, message: creditResult.message });
        }

        const smsResult = await sendSMS(mobile, finalMessage, {
            userId: req.user.id,
            templateId: finalTemplateId,
            sender: senderId,
            peId: finalPeId,
            hashId: finalHashId
        });
        
        if (!smsResult.success) {
            return res.status(502).json({ success: false, message: smsResult.error });
        }

        // 4. Log to api_message_logs using the identical ID sent to gateway
        const finalMsgId = smsResult.messageId;

        await query(
            'INSERT INTO api_message_logs (user_id, campaign_id, campaign_name, template_name, message_id, recipient, status, send_time, channel) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?)',
            [req.user.id, 'API_V1', 'Direct SMS API', templateId || 'Direct SMS', finalMsgId, mobile, 'sent', 'SMS']
        );

        res.json({
            success: true,
            message: 'SMS sent successfully',
            messageId: finalMsgId,
            resolved: {
                templateId: finalTemplateId,
                peId: finalPeId,
                templateSource: templateResolved ? 'database' : 'input'
            },
            providerResponse: typeof smsResult.response === 'object' ? JSON.stringify(smsResult.response) : String(smsResult.response)
        });

    } catch (err) {
        console.error('SMS API v1 error:', err.message);
        res.status(500).json({ success: false, message: err.message });
    }
};

router.get('/debug-templates', authenticateApiKey, async (req, res) => {
    try {
        const [templates] = await query('SELECT id, name, body, metadata FROM message_templates WHERE user_id = ?', [req.user.id]);
        res.json({ success: true, user: req.user.id, templates });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.get('/send', authenticateApiKey, handleSendSms);
router.post('/send', authenticateApiKey, handleSendSms);

module.exports = router;
