const { query } = require('../config/db');
const axios = require('axios');
const path = require('path');
const dotenv = require('dotenv');

// Load env if not already loaded (useful for standalone scripts)
dotenv.config({ path: path.join(__dirname, '../.env') });

/**
 * Replace placeholders in the gateway URL
 * @param {string} url - The gateway URL with placeholders like %TO, %MSGTEXT, etc.
 * @param {object} data - Data to replace placeholders with
 * @returns {string} - The formatted URL
 */
const replacePlaceholders = (url, data) => {
    if (!url) return '';
    let formatted = url;
    
    // Default placeholders
    const replacements = {
        '%TO': data.mobile || '',
        '%MSGTEXT': encodeURIComponent(data.message || ''),
        '%FROM': data.sender || process.env.SMS_SENDER_ID || '',
        '%TEMPID': data.templateId || '',
        '%PEID': data.peId || '',
        '%USER': process.env.SMS_USER || '',
        '%PWD': process.env.SMS_PASSWORD || '',
        '%HASHID': data.hashId || '',
        '%MSGID': data.msgId || `sms_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        '%CALLBACK': encodeURIComponent(data.callbackUrl || ''),
        '%DLRUSERID': data.userId || '0',
        '%VENDOR': data.gatewayName || 'NotifyNow'
    };

    Object.keys(replacements).forEach(key => {
        const regex = new RegExp(key.replace('%', '\\%'), 'g');
        formatted = formatted.replace(regex, replacements[key]);
    });

    return formatted;
};

const sendSMS = async (mobile, message, templateOrOptions = {}) => {
    try {
        // Handle case where third arg is just the string templateId
        const options = typeof templateOrOptions === 'string' ? { templateId: templateOrOptions } : templateOrOptions;
        
        let gateway = null;
        const userId = options.userId || '0';

        // 1. Try to fetch user's assigned gateway
        if (userId && userId !== '0') {
            const [users] = await query('SELECT sms_gateway_id FROM users WHERE id = ?', [userId]);
            if (users.length > 0 && users[0].sms_gateway_id) {
                const [gateways] = await query('SELECT * FROM sms_gateways WHERE id = ? AND status = "active"', [users[0].sms_gateway_id]);
                if (gateways.length > 0) {
                    gateway = gateways[0];
                    console.log(`[SMS] Using assigned gateway "${gateway.name}" for user ${userId}`);
                }
            }
        }

        // 2. Fallback to first active gateway if no user-specific gateway
        if (!gateway) {
            const [gateways] = await query('SELECT * FROM sms_gateways WHERE status = "active" ORDER BY id ASC LIMIT 1');
            if (gateways.length > 0) {
                gateway = gateways[0];
                console.log(`[SMS] Using global default gateway "${gateway.name}"`);
            }
        }

        // 3. Last fallback: Use .env values with a default URL if no database gateway exists
        if (!gateway) {
            console.warn('[SMS] No gateways found in database. Using .env fallback.');
            const user = process.env.SMS_USER;
            const pwd = process.env.SMS_PASSWORD;
            const sender = process.env.SMS_SENDER_ID || 'NOTIFY';
            
            if (!user || !pwd) {
                throw new Error('No SMS gateway configured (DB or .env)');
            }

            const cleanMobile = mobile.replace(/\D/g, '');
            const baseUrl = 'https://sms.cell24x7.in/otpReceiver/sendSMS';
            const url = `${baseUrl}?user=${encodeURIComponent(user)}&pwd=${encodeURIComponent(pwd)}&sender=${encodeURIComponent(sender)}&mobile=${encodeURIComponent(cleanMobile)}&msg=${encodeURIComponent(message)}&mt=0`;
            
            console.log(`[SMS] Sending fallback to ${mobile}`);
            const response = await axios.get(url, { timeout: 10000 });
            return response.data;
        }

        // Clean mobile number (keep it digits-only for most replacements)
        const cleanMobile = mobile.replace(/\D/g, '');
        
        // 4. Generate/Capture Message ID for tracking
        const msgId = options.msgId || `sms_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

        // Get system base URL for callback
        const baseUrl = process.env.API_BASE_URL || `https://${process.env.DOMAIN}` || 'http://localhost:5000';
        const callbackUrl = `${baseUrl}/api/webhooks/sms/callback`;

        // 5. Format the primary URL
        const data = {
            mobile: cleanMobile,
            message: message,
            sender: options.sender || process.env.SMS_SENDER_ID,
            templateId: options.templateId || '',
            peId: options.peId || '',
            hashId: options.hashId || '',
            userId: options.userId || '0',
            msgId: msgId,
            callbackUrl: callbackUrl,
            gatewayName: gateway.name
        };

        const finalUrl = replacePlaceholders(gateway.primary_url, data);
        
        // Log the outgoing URL (masking sensitive keys)
        const loggedUrl = finalUrl.replace(/(user|pass|password|pwd|key|apikey|sid|auth|token)=([^&]+)/gi, '$1=*******');
        console.log(`[SMS-LOG] Sending to ${mobile} via ${gateway.name}`);
        console.log(`[SMS-LOG] URL: ${loggedUrl}`);

        const response = await axios.get(finalUrl, { timeout: 10000 });
        const result = response.data;
        
        console.log(`[SMS-LOG] Provider Response: ${typeof result === 'object' ? JSON.stringify(result) : String(result)}`);

        // Basic success check
        const responseStr = String(result).toLowerCase();
        return { success: true, response: result, messageId: data.msgId };
    } catch (err) {
        console.error('[SMS] Send Error:', err.message);
        return { success: false, error: err.message, messageId: null };
    }
};

module.exports = { sendSMS };

