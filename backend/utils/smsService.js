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
    
    // Default placeholders
    const replacements = {
        '%TO': data.mobile || '',
        '%MSGTEXT': encodeURIComponent(data.message || ''),
        '%HEX_MSGTEXT': data.isUnicode ? toUcs2Hex(data.message) : encodeURIComponent(data.message || ''),
        '%FROM': data.sender || process.env.SMS_SENDER_ID || 'NOTIFY',
        '%TEMPID': (data.templateId || '').toString(),
        '%PEID': (data.peId || '').toString(),
        '%USER': process.env.SMS_USER || '',
        '%PWD': process.env.SMS_PASSWORD || '',
        '%HASHID': (data.hashId || '').toString(),
        '%MSGID': data.msgId || `sms_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        '%CALLBACK': encodeURIComponent(data.callbackUrl || ''),
        '%DLRUSERID': data.userId || '0',
        '%VENDOR': data.gatewayName || 'NotifyNow',
        '%MSGTYPE': data.isUnicode ? '2' : '0'
    };

    // Single-Pass Replacement Strategy:
    // This prevents any recursive or double-replacement issues
    const sortedKeys = Object.keys(replacements).sort((a, b) => b.length - a.length);
    
    // We match the key followed by an optional trailing % 
    // IF AND ONLY IF that trailing % is not followed by two hex digits (which would be URL encoding)
    const pattern = sortedKeys.map(key => {
        const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return `(${escaped}%(?![0-9a-fA-F]{2})|${escaped})`;
    }).join('|');
    
    const regex = new RegExp(pattern, 'g');
    
    return url.replace(regex, (match) => {
        // Strip trailing % if present to find the base key in our lookups
        const cleanMatch = match.endsWith('%') && !replacements[match] ? match.slice(0, -1) : match;
        return replacements[cleanMatch] !== undefined ? replacements[cleanMatch] : match;
    });
};

/**
 * Checks if a string contains any non-GSM characters
 * @param {string} text 
 * @returns {boolean}
 */
const isUnicodeMessage = (text) => {
    if (!text) return false;
    // GSM 03.38 character set: A-Z a-z 0-9 @£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./:;<=>?¡¿\\[\\]^_{|}~€
    const gsmSet = /^[A-Za-z0-9@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&'()*+,-./:;<=>?¡¿\\\[\\\]\^_{|}~€]*$/;
    return !gsmSet.test(text);
};

/**
 * Converts a string to UCS-2 Hexadecimal
 * @param {string} str 
 * @returns {string}
 */
const toUcs2Hex = (str) => {
    return Array.from(str)
        .map(char => char.charCodeAt(0).toString(16).padStart(4, '0'))
        .join('')
        .toUpperCase();
};

const sendSMS = async (mobile, message, templateOrOptions = {}) => {
    try {
        // Clean mobile number (keep it digits-only for most replacements)
        const cleanMobile = mobile.replace(/\D/g, '');

        // Handle case where third arg is just the string templateId
        const options = typeof templateOrOptions === 'string' ? { templateId: templateOrOptions } : templateOrOptions;
        
        let gateway = null;
        const userId = options.userId || '0';

        // 1. Try to fetch user's assigned gateway and DLT defaults
        if (userId && userId !== '0') {
            const [users] = await query('SELECT sms_gateway_id, pe_id, hash_id FROM users WHERE id = ?', [userId]);
            if (users.length > 0) {
                // Set defaults if missing in options
                if (!options.peId) options.peId = users[0].pe_id;
                if (!options.hashId) options.hashId = users[0].hash_id;

                if (users[0].sms_gateway_id) {
                    const [gateways] = await query('SELECT * FROM sms_gateways WHERE id = ? AND status = "active"', [users[0].sms_gateway_id]);
                    if (gateways.length > 0) {
                        gateway = gateways[0];
                    }
                }
            }
        }

        // 2. Fallback to first active gateway if no user-specific gateway
        if (!gateway) {
            const [gateways] = await query('SELECT * FROM sms_gateways WHERE status = "active" ORDER BY id ASC LIMIT 1');
            if (gateways.length > 0) {
                gateway = gateways[0];
                // console.log(`[SMS] Using global default gateway "${gateway.name}"`);
            }
        }

        // 3. Last fallback: Use .env values with a default URL if no database gateway exists
        if (!gateway) {
            // console.warn('[SMS] No gateways found in database. Using .env fallback.');
            const user = process.env.SMS_USER;
            const pwd = process.env.SMS_PASSWORD;
            const sender = process.env.SMS_SENDER_ID || 'NOTIFY';
            
            if (!user || !pwd) {
                throw new Error('No SMS gateway configured (DB or .env)');
            }

            const baseUrl = 'https://sms.cell24x7.in/otpReceiver/sendSMS';
            const msgTypeParam = options.isUnicode ? '2' : '0';
            const url = `${baseUrl}?user=${encodeURIComponent(user)}&pwd=${encodeURIComponent(pwd)}&sender=${encodeURIComponent(sender)}&mobile=${encodeURIComponent(cleanMobile)}&msg=${encodeURIComponent(message)}&mt=${msgTypeParam}`;
            
            // console.log(`[SMS] Sending fallback to ${mobile} (Unicode: ${options.isUnicode})`);
            const response = await axios.get(url, { timeout: 10000 });
            return response.data;
        }

        // 4. Generate/Capture Message ID for tracking
        const msgId = options.msgId || `sms_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

        // Get system base URL for callback (Using passed callbackUrl or detecting from env)
        const baseUrl = process.env.API_BASE_URL || `https://${process.env.DOMAIN}` || 'https://notifynow.in';
        const finalCallbackUrl = options.callbackUrl || `${baseUrl}/api/webhooks/sms/callback`;

        // 5. Format the data for placeholders
        const detectedUnicode = isUnicodeMessage(message);
        const data = {
            mobile: cleanMobile,
            message: message,
            sender: options.sender || gateway.sender_id || process.env.SMS_SENDER_ID || 'NOTIFY',
            templateId: (options.templateId || '').toString(),
            peId: (options.peId || '').toString(),
            hashId: (options.hashId || '').toString(),
            userId: options.userId || '0',
            msgId: msgId,
            callbackUrl: finalCallbackUrl,
            gatewayName: gateway?.name || 'NotifyNow',
            isUnicode: options.isUnicode || detectedUnicode
        };

        const finalUrl = replacePlaceholders(gateway.primary_url, data);
        
        // Log the outgoing URL (masking sensitive keys)
        const loggedUrl = finalUrl.replace(/(user|pass|password|pwd|key|apikey|sid|auth|token)=([^&]+)/gi, '$1=*******');
        
        if (!data.templateId && process.env.NODE_ENV === 'production') {
            console.warn(`[SMS-WARN] Sending to ${mobile} without Template ID via ${gateway.name}. This may fail in India.`);
        }

        // console.log(`[SMS-LOG] Sending to ${mobile} via ${gateway.name}`);
        // console.log(`[SMS-LOG] URL: ${loggedUrl}`);

        const response = await axios.get(finalUrl, { timeout: 10000 });
        const result = response.data;
        
        // console.log(`[SMS-LOG] Provider Response: ${typeof result === 'object' ? JSON.stringify(result) : String(result).substring(0, 100)}`);

        // Basic success check (Most Indian gateways return 'success', 'ok', or a Numeric ID)
        const responseStr = String(result).toLowerCase();
        const isSuccess = responseStr.includes('ok') || 
                          responseStr.includes('success') || 
                          /^\d+$/.test(responseStr) || 
                          (typeof result === 'object' && (result.status === 'success' || result.success));

        if (!isSuccess && responseStr.includes('error')) {
            return { success: false, error: result, messageId: data.msgId };
        }

        return { success: true, response: result, messageId: data.msgId };
    } catch (err) {
        console.error('[SMS] Send Error:', err.message);
        return { success: false, error: err.message, messageId: null };
    }
};

module.exports = { sendSMS };

