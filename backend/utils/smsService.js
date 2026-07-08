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

        const isCustomGsmRequest = options.templateId === 'GSM_CUSTOM' || options.templateId === 'custom';

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

        // 2. SMART ROUTING: Override gateway if it mismatches the campaign type
        if (isCustomGsmRequest) {
            // Must use Dinstar OR Nuke Custom GSM Gateway
            const isAssignedCustomGw = gateway && (
                (gateway.name && gateway.name.toLowerCase().includes('dinstar')) || (gateway.primary_url && gateway.primary_url.includes('dinstar')) ||
                (gateway.name && gateway.name.toLowerCase().includes('nuke')) || (gateway.primary_url && gateway.primary_url.includes('nuke.co.in'))
            );
            
            if (!isAssignedCustomGw) {
                // Check if reseller owns a custom gateway
                const [ownedCustom] = await query('SELECT * FROM sms_gateways WHERE reseller_id = ? AND status = "active" AND (LOWER(name) LIKE "%dinstar%" OR primary_url LIKE "%dinstar%" OR LOWER(name) LIKE "%nuke%" OR primary_url LIKE "%nuke.co.in%") ORDER BY id ASC LIMIT 1', [userId]);
                
                if (ownedCustom.length > 0) {
                    gateway = ownedCustom[0];
                } else {
                    // Fallback to global custom gateway
                    const [customGateways] = await query('SELECT * FROM sms_gateways WHERE status = "active" AND (LOWER(name) LIKE "%dinstar%" OR primary_url LIKE "%dinstar%" OR LOWER(name) LIKE "%nuke%" OR primary_url LIKE "%nuke.co.in%") ORDER BY id ASC LIMIT 1');
                    if (customGateways.length > 0) {
                        gateway = customGateways[0];
                    } else {
                        throw new Error("No active Dinstar or Nuke GSM gateway found for custom message.");
                    }
                }
            }
        } else {
            // Must use Official DLT Gateway (Not Dinstar, Not Nuke)
            const isAssignedCustomGw = gateway && (
                (gateway.name && gateway.name.toLowerCase().includes('dinstar')) || (gateway.primary_url && gateway.primary_url.includes('dinstar')) ||
                (gateway.name && gateway.name.toLowerCase().includes('nuke')) || (gateway.primary_url && gateway.primary_url.includes('nuke.co.in'))
            );
            if (isAssignedCustomGw || !gateway) {
                // Check if reseller owns an official gateway
                const [ownedOfficial] = await query('SELECT * FROM sms_gateways WHERE reseller_id = ? AND status = "active" AND LOWER(name) NOT LIKE "%dinstar%" AND primary_url NOT LIKE "%dinstar%" AND LOWER(name) NOT LIKE "%nuke%" AND primary_url NOT LIKE "%nuke.co.in%" ORDER BY id ASC LIMIT 1', [userId]);
                
                if (ownedOfficial.length > 0) {
                    gateway = ownedOfficial[0];
                } else {
                    // Fallback to global official gateway
                    const [officialGateways] = await query('SELECT * FROM sms_gateways WHERE status = "active" AND LOWER(name) NOT LIKE "%dinstar%" AND primary_url NOT LIKE "%dinstar%" AND LOWER(name) NOT LIKE "%nuke%" AND primary_url NOT LIKE "%nuke.co.in%" ORDER BY id ASC LIMIT 1');
                    if (officialGateways.length > 0) {
                        gateway = officialGateways[0];
                    } else if (!gateway) {
                        // Absolute fallback if no official gateway exists
                        const [anyGateway] = await query('SELECT * FROM sms_gateways WHERE status = "active" ORDER BY id ASC LIMIT 1');
                        if (anyGateway.length > 0) {
                            gateway = anyGateway[0];
                        }
                    }
                }
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

        // Get system base URL for callback (Prioritize DLR_BASE_URL for SMS DLR to avoid SSL issues)
        const baseUrl = process.env.DLR_BASE_URL || process.env.API_BASE_URL || `https://${process.env.DOMAIN}` || 'https://notifynow.in';
        let finalCallbackUrl = options.callbackUrl || `${baseUrl}/api/webhooks/sms/callback`;

        // Force plain HTTP for live domain callbacks to prevent SSL negotiation failures on legacy gateways
        if (finalCallbackUrl.startsWith('https://notifynow.in')) {
            finalCallbackUrl = finalCallbackUrl.replace('https://notifynow.in', 'http://notifynow.in');
        }

        // 5. Format the data for placeholders
        const detectedUnicode = isUnicodeMessage(message);
        let isUnicodeVal = detectedUnicode;
        if (options.isUnicode !== undefined && options.isUnicode !== null) {
            isUnicodeVal = options.isUnicode === 'true' || options.isUnicode === true || options.isUnicode === '1' || options.isUnicode === 1;
        }

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
            isUnicode: isUnicodeVal
        };

        // --- NEW: Intercept Dinstar GSM Gateway ---
        const isDinstar = gateway && (
            (gateway.name && gateway.name.toLowerCase().includes('dinstar')) ||
            (gateway.primary_url && gateway.primary_url.includes('dinstar/api/sms/send'))
        );

        if (isDinstar) {
            // Strip any query parameters (like DLR URLs) from the primary URL
            const baseUrl = gateway.primary_url.split('?')[0];
            
            // Dinstar might require exactly the local number without 91 prefix
            const dinstarMobile = cleanMobile.length === 12 && cleanMobile.startsWith('91') 
                ? cleanMobile.substring(2) 
                : cleanMobile;

            console.log(`📡 [SMS] Sending via Dinstar GSM Gateway: ${gateway.name} | URL: ${baseUrl} | Mobile: ${dinstarMobile}`);
            
            const payload = {
                text: message,
                param: [{ number: dinstarMobile }],
                port: [0],
                encoding: "unicode", // Force unicode as per user's curl which worked
                request_status_report: true
            };

            try {
                const response = await axios.post(baseUrl, payload, {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 15000
                });
                
                const result = response.data;
                if (result && result.error) {
                    return { success: false, error: result, messageId: data.msgId };
                }
                return { success: true, response: result, messageId: data.msgId };
            } catch (dinstarErr) {
                console.error('[SMS] Dinstar Send Error:', dinstarErr.message);
                if (dinstarErr.response && dinstarErr.response.data) {
                    console.error('[SMS] Dinstar Error Response:', JSON.stringify(dinstarErr.response.data));
                }
                throw dinstarErr; // throw to be caught by the outer catch
            }
        }
        // ------------------------------------------

        // --- NEW: Intercept Nuke GSM Gateway ---
        const isNuke = gateway && (
            (gateway.name && gateway.name.toLowerCase().includes('nuke')) ||
            (gateway.primary_url && gateway.primary_url.includes('nuke.co.in'))
        );

        if (isNuke) {
            const baseUrl = gateway.primary_url.split('?')[0]; // Typically: https://wa20.nuke.co.in/webhook/api/addbroadcastgsm.php
            
            console.log(`📡 [SMS] Sending via Nuke GSM Gateway: ${gateway.name} | URL: ${baseUrl} | Mobile: ${cleanMobile}`);
            
            const params = new URLSearchParams();
            params.append('broadcast_name', 'NotifyNow API');
            params.append('brodcast_service', 'sms_credits');
            params.append('contacts', cleanMobile);
            params.append('message', message);

            try {
                // Use token from dashboard if saved, otherwise use the hardcoded one provided by client
                const nukeToken = gateway.api_key || gateway.password || "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE3ODM1MDcyMDYsInZlciI6MiwiZGF0YSI6eyJ1c2VybmFtZSI6ImNlbGwyNHg3IiwibmFtZSI6ImNlbGwyNHg3In19.OpnWZbZFh5hq9_OGDD4n-biElZr5PqHNai4NINUsLaw";
                
                const response = await axios.post(baseUrl, params, {
                    headers: { 
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Authorization': `Bearer ${nukeToken}`
                    },
                    timeout: 15000
                });
                
                const result = response.data;
                if (result && (result.status === 'false' || result.status === false)) {
                    return { success: false, error: result, messageId: data.msgId };
                }
                return { success: true, response: result, messageId: data.msgId };
            } catch (nukeErr) {
                console.error('[SMS] Nuke Send Error:', nukeErr.message);
                if (nukeErr.response && nukeErr.response.data) {
                    console.error('[SMS] Nuke Error Response:', JSON.stringify(nukeErr.response.data));
                }
                throw nukeErr; 
            }
        }
        // ------------------------------------------

        const finalUrl = replacePlaceholders(gateway.primary_url, data);
        
        // Log the outgoing URL (masking sensitive keys)
        const loggedUrl = finalUrl.replace(/(user|pass|password|pwd|key|apikey|sid|auth|token)=([^&]+)/gi, '$1=*******');
        console.log(`📡 [SMS] Sending via Gateway: ${gateway.name} | URL: ${loggedUrl}`);
        
        if (!data.templateId && process.env.NODE_ENV === 'production') {
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

