const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { sendSMS } = require('../utils/smsService');
const { deductSingleMessageCredit } = require('../services/walletService');

/**
 * Enhanced Authentication Middleware for API Key
 */
const authenticateApiKey = async (req, res, next) => {
    const apiKey = req.headers['x-api-key'] || req.query.apiKey;

    if (!apiKey) {
        return res.status(401).json({ success: false, message: 'API Key is required.' });
    }

    try {
        const [users] = await query('SELECT id, name, company, role, status FROM users WHERE api_key = ?', [apiKey]);
        
        if (users.length === 0) {
            return res.status(403).json({ success: false, message: 'Invalid API Key' });
        }

        if (users[0].status !== 'active') {
            return res.status(403).json({ success: false, message: 'User account is not active' });
        }

        req.user = users[0];
        next();
    } catch (err) {
        if (err.code === 'ER_BAD_FIELD_ERROR' && err.sqlMessage.includes('api_key')) {
            console.error('⚠️ [API-AUTH] missing "api_key" column in users table. Please run migration.');
            return res.status(500).json({ success: false, message: 'System configuration error: API Key support not initialized.' });
        }
        console.error('API Key Auth Error:', err);
        res.status(500).json({ success: false, message: 'Authentication error' });
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
            console.log(`[SMS-API] No templateId provided, attempting auto-detection for user ${req.user.id}`);
            const [userTemplates] = await query(
                'SELECT id, name, body, metadata FROM message_templates WHERE user_id = ?',
                [req.user.id]
            );

            for (const tmpl of userTemplates) {
                if (!tmpl.body) continue;
                
                // Robust matching: Mask placeholders of various styles, escape regex chars, then apply wildcards
                let regexStr = tmpl.body.trim();
                // Match {#var#}, {{var}}, {var}, %var%, or [var]
                regexStr = regexStr.replace(/\{#[^#]+#\}|\{\{[^}]+\}\}|\{[^}]+\}|%[^%]+%|\[[^\]]+\]/g, '___WILDCARD___');
                regexStr = regexStr.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                regexStr = regexStr.replace(/___WILDCARD___/g, '.*');
                
                const matcher = new RegExp(`^${regexStr}$`, 's');
                if (matcher.test(finalMessage.trim())) {
                    try {
                        const meta = typeof tmpl.metadata === 'string' ? JSON.parse(tmpl.metadata) : (tmpl.metadata || {});
                        finalTemplateId = meta.templateId || meta.dlt_template_id || tmpl.id;
                        finalPeId = meta.peId || meta.pe_id || '';
                        finalHashId = meta.hashId || meta.hash_id || '';
                        templateResolved = true;
                        console.log(`[SMS-API] Auto-detected template "${tmpl.name}" for message`);
                        break;
                    } catch (e) {}
                }
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

        // 3. Send SMS
        const result = await sendSMS(mobile, finalMessage, {
            userId: req.user.id,
            templateId: finalTemplateId,
            sender: senderId,
            peId: finalPeId,
            hashId: finalHashId
        });

        // 4. Log to api_message_logs
        const internalMsgId = `API_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        await query(
            'INSERT INTO api_message_logs (user_id, campaign_id, campaign_name, template_name, message_id, recipient, status, send_time, channel) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?)',
            [req.user.id, 'API_V1', 'Direct SMS API', templateId || 'Direct SMS', internalMsgId, mobile, 'sent', 'SMS']
        );

        res.json({
            success: true,
            message: 'SMS sent successfully',
            messageId: internalMsgId,
            resolved: {
                templateId: finalTemplateId,
                peId: finalPeId,
                templateSource: templateResolved ? 'database' : 'input'
            },
            providerResponse: typeof result === 'object' ? JSON.stringify(result) : String(result)
        });

    } catch (err) {
        console.error('SMS API v1 error:', err.message);
        res.status(500).json({ success: false, message: err.message });
    }
};

router.get('/send', authenticateApiKey, handleSendSms);
router.post('/send', authenticateApiKey, handleSendSms);

module.exports = router;
