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
            // Support both API-specific password and regular login password as fallback
            const [users] = await query('SELECT id, name, company, role, status, api_password, password FROM users WHERE email = ? OR contact_phone = ?', [username, username]);
            if (users.length > 0) {
                const dbApiPassword = users[0].api_password;
                const dbLoginPassword = users[0].password;
                
                // 1. Try API Password first
                let match = false;
                if (dbApiPassword) {
                    match = await bcrypt.compare(password, dbApiPassword);
                }
                
                // 2. Fallback to Login Password if API Password is not set
                if (!match && !dbApiPassword && dbLoginPassword) {
                    match = await bcrypt.compare(password, dbLoginPassword);
                }

                if (match) {
                    const { api_password, password: _, ...safeUser } = users[0];
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

    // Optional Unicode Parameter Override
    let userUnicode = undefined;
    if (params.unicode !== undefined) {
        userUnicode = params.unicode === 'true' || params.unicode === true || params.unicode === '1' || params.unicode === 1;
    } else if (params.isUnicode !== undefined) {
        userUnicode = params.isUnicode === 'true' || params.isUnicode === true || params.isUnicode === '1' || params.isUnicode === 1;
    } else if (params.is_unicode !== undefined) {
        userUnicode = params.is_unicode === 'true' || params.is_unicode === true || params.is_unicode === '1' || params.is_unicode === 1;
    }

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

        // 2. Final Guard / Routing: If no DLT template matched, treat as Custom GSM
        if (!finalTemplateId || !finalPeId) {
            console.warn(`[SMS-API] No DLT metadata matched. Routing as GSM_CUSTOM.`);
            finalTemplateId = 'GSM_CUSTOM';
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
            callbackUrl: callbackUrl,
            isUnicode: userUnicode
        });
        
        if (!smsResult.success) {
            const errorMsg = smsResult.error ? (typeof smsResult.error === 'string' ? smsResult.error : JSON.stringify(smsResult.error)) : 'Unknown error';
            const isGsmError = finalTemplateId === 'GSM_CUSTOM' || errorMsg.includes('Nuke') || errorMsg.includes('Dinstar');
            
            return res.status(502).json({ 
                success: false, 
                message: 'Gateway Rejection: ' + errorMsg,
                details: isGsmError ? 'Check your GSM gateway configuration, credits, or mobile number format.' : 'Ensure your message matches the DLT template exactly and provides valid Template ID.'
            });
        }

        // 5. Log to API usage
        const finalMsgId = smsResult.messageId;
        await query(
            'INSERT INTO api_message_logs (user_id, campaign_id, campaign_name, template_name, message_id, recipient, status, created_at, send_time, channel) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), ?)',
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
        const errorMsg = err.message || 'Unknown error';
        const isGsmError = errorMsg.includes('Nuke API Error') || errorMsg.includes('Dinstar');
        res.status(isGsmError ? 400 : 500).json({ 
            success: false, 
            message: isGsmError ? errorMsg : 'Internal Server Error: ' + errorMsg 
        });
    }
};

/**
 * Handle OTP SMS Generation and Dispatch
 */
const handleSendOtp = async (req, res) => {
    const params = { ...req.query, ...req.body };
    const mobile = params.mobile || params.to || params.phone;
    const message = params.message || params.msg || params.text;
    
    // DLT Specific IDs
    let templateId = params.templateId || params.template_id || params.dlt_template_id || params.temp_id;
    let senderId = params.senderId || params.sender_id || params.sender || params.from;
    let peId = params.peId || params.pe_id;
    let hashId = params.hashId || params.hash_id;

    // Optional Unicode Parameter Override
    let userUnicode = undefined;
    if (params.unicode !== undefined) {
        userUnicode = params.unicode === 'true' || params.unicode === true || params.unicode === '1' || params.unicode === 1;
    } else if (params.isUnicode !== undefined) {
        userUnicode = params.isUnicode === 'true' || params.isUnicode === true || params.isUnicode === '1' || params.isUnicode === 1;
    } else if (params.is_unicode !== undefined) {
        userUnicode = params.is_unicode === 'true' || params.is_unicode === true || params.is_unicode === '1' || params.is_unicode === 1;
    }

    if (!mobile) {
        return res.status(400).json({ success: false, message: 'Mobile number is required (mobile or to)' });
    }

    if (!message) {
        return res.status(400).json({ success: false, message: 'Message content is required (must contain OTP placeholder e.g. %OTP%)' });
    }

    // Must contain %OTP%, {#OTP#}, or {{otp}}
    const hasPlaceholder = /%OTP%|\{#OTP#\}|\{\{otp\}\}/i.test(message);
    if (!hasPlaceholder) {
        return res.status(400).json({ success: false, message: 'Message template must contain an OTP placeholder: %OTP%, {#OTP#}, or {{otp}}' });
    }

    const cleanMobile = mobile.replace(/\D/g, '');
    if (!cleanMobile) {
        return res.status(400).json({ success: false, message: 'Invalid mobile number' });
    }

    try {
        // Generate 6-digit OTP code and unique session ID
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const { v4: uuidv4 } = require('uuid');
        const otpSessionId = 'otp_' + uuidv4().replace(/-/g, '');
        const expiry = new Date(Date.now() + 5 * 60 * 1000); // 5 mins expiry

        // Replace placeholder in message
        const finalMessage = message.replace(/%OTP%|\{#OTP#\}|\{\{otp\}\}/gi, otpCode);

        let finalTemplateId = templateId || '';
        let finalSenderId = senderId || '';
        let finalPeId = peId || '';
        let finalHashId = hashId || '';
        let templateResolved = false;

        // Resolve DLT Metadata from Database if templateId is provided
        if (templateId) {
            // Check user's message_templates first
            const [msgTmpl] = await query(
                'SELECT name, body, metadata FROM message_templates WHERE (id = ? OR name = ?) AND user_id = ? LIMIT 1',
                [templateId, templateId, req.user.id]
            );

            if (msgTmpl.length > 0) {
                const tmpl = msgTmpl[0];
                try {
                    const meta = typeof tmpl.metadata === 'string' ? JSON.parse(tmpl.metadata) : (tmpl.metadata || {});
                    finalTemplateId = meta.templateId || meta.dlt_template_id || finalTemplateId;
                    finalPeId = meta.peId || meta.pe_id || finalPeId;
                    finalHashId = meta.hashId || meta.hash_id || finalHashId;
                    templateResolved = true;
                } catch (e) {
                    console.warn('[SMS-API-OTP] Meta parse failed for templateId:', templateId);
                }
            } else {
                // Check global dlt_templates if not found in personal templates
                const [dltTmpl] = await query(
                    'SELECT temp_id, pe_id, hash_id FROM dlt_templates WHERE (temp_id = ? OR temp_name = ?) LIMIT 1',
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

        // Save OTP record to database
        await query(
            'INSERT INTO otp_verifications (user_id, mobile, otp_code, otp_session_id, expiry, status, attempts) VALUES (?, ?, ?, ?, ?, "pending", 0)',
            [req.user.id, cleanMobile, otpCode, otpSessionId, expiry]
        );

        // Credit Check & Deduction
        const creditResult = await deductSingleMessageCredit(req.user.id, 'sms', finalTemplateId || 'OTP Send');
        if (!creditResult.success) {
            return res.status(402).json({ success: false, message: creditResult.message });
        }

        // Dispatch SMS
        const baseUrl = (process.env.API_BASE_URL || 'http://notifynow.in').replace('https://', 'http://');
        const callbackUrl = `${baseUrl}/api/webhooks/sms/callback`;
        
        const smsResult = await sendSMS(cleanMobile, finalMessage, {
            userId: req.user.id,
            templateId: finalTemplateId,
            sender: finalSenderId,
            peId: finalPeId,
            hashId: finalHashId,
            callbackUrl: callbackUrl,
            isUnicode: userUnicode
        });

        if (!smsResult.success) {
            return res.status(502).json({ 
                success: false, 
                message: 'Gateway Rejection: ' + smsResult.error,
                details: 'Ensure your message matches the DLT template exactly and provides valid Template ID.'
            });
        }

        // Log to API usage
        const finalMsgId = smsResult.messageId;
        await query(
            'INSERT INTO api_message_logs (user_id, campaign_id, campaign_name, template_name, message_id, recipient, status, created_at, send_time, channel) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), ?)',
            [req.user.id, 'API_OTP_V1', 'OTP SMS API', finalTemplateId || 'OTP SMS', finalMsgId, cleanMobile, 'sent', 'SMS']
        );

        res.json({
            success: true,
            message: 'OTP sent successfully',
            otp_session_id: otpSessionId
        });

    } catch (err) {
        console.error('OTP Send API error:', err);
        res.status(500).json({ success: false, message: 'Internal Server Error: ' + err.message });
    }
};

/**
 * Handle OTP Verification
 */
const handleVerifyOtp = async (req, res) => {
    const params = { ...req.query, ...req.body };
    const mobile = params.mobile || params.to || params.phone;
    const otp = params.otp || params.code;
    const otpSessionId = params.otp_session_id || params.sessionId || params.session_id;

    if (!mobile) {
        return res.status(400).json({ success: false, message: 'Mobile number is required (mobile or to)' });
    }

    if (!otp) {
        return res.status(400).json({ success: false, message: 'OTP code is required (otp or code)' });
    }

    const cleanMobile = mobile.replace(/\D/g, '');
    if (!cleanMobile) {
        return res.status(400).json({ success: false, message: 'Invalid mobile number' });
    }

    try {
        let record = null;
        if (otpSessionId) {
            // Find specific session
            const [rows] = await query(
                'SELECT * FROM otp_verifications WHERE user_id = ? AND mobile = ? AND otp_session_id = ? ORDER BY id DESC LIMIT 1',
                [req.user.id, cleanMobile, otpSessionId]
            );
            if (rows.length > 0) record = rows[0];
        } else {
            // Find latest pending session for this number
            const [rows] = await query(
                'SELECT * FROM otp_verifications WHERE user_id = ? AND mobile = ? AND status = "pending" ORDER BY id DESC LIMIT 1',
                [req.user.id, cleanMobile]
            );
            if (rows.length > 0) record = rows[0];
        }

        if (!record) {
            return res.status(404).json({ success: false, message: 'No pending OTP verification request found for this mobile number.' });
        }

        // Check if already verified
        if (record.status === 'verified') {
            return res.status(400).json({ success: false, message: 'OTP has already been verified' });
        }

        // Check if expired
        const isExpiredByTime = new Date() > new Date(record.expiry);
        if (record.status === 'expired' || isExpiredByTime) {
            if (record.status === 'pending') {
                await query('UPDATE otp_verifications SET status = "expired" WHERE id = ?', [record.id]);
            }
            return res.status(400).json({ success: false, message: 'OTP has expired' });
        }

        // Verify the code
        if (record.otp_code.trim() !== otp.toString().trim()) {
            const newAttempts = record.attempts + 1;
            let finalStatus = 'pending';
            
            if (newAttempts >= 3) {
                finalStatus = 'expired';
            }

            await query('UPDATE otp_verifications SET attempts = ?, status = ? WHERE id = ?', [newAttempts, finalStatus, record.id]);

            if (finalStatus === 'expired') {
                return res.status(400).json({ success: false, message: 'Invalid OTP. Max verification attempts exceeded. OTP expired.' });
            }
            return res.status(400).json({ success: false, message: 'Invalid OTP' });
        }

        // OTP is correct! Update status to verified
        await query('UPDATE otp_verifications SET status = "verified" WHERE id = ?', [record.id]);

        res.json({
            success: true,
            message: 'OTP verified successfully'
        });

    } catch (err) {
        console.error('OTP Verification API error:', err);
        res.status(500).json({ success: false, message: 'Internal Server Error: ' + err.message });
    }
};

router.get('/send', authenticateApiKey, handleSendSms);
router.post('/send', authenticateApiKey, handleSendSms);

router.get('/otp/send', authenticateApiKey, handleSendOtp);
router.post('/otp/send', authenticateApiKey, handleSendOtp);

router.get('/otp/verify', authenticateApiKey, handleVerifyOtp);
router.post('/otp/verify', authenticateApiKey, handleVerifyOtp);

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

