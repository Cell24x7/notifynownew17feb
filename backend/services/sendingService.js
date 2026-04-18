const axios = require('axios');
const { query } = require('../config/db');
const { sendRcsTemplate, sendRcsMessage } = require('./rcsService');
const { sendSMS } = require('../utils/smsService');
const { sendEmail } = require('./emailService');
const crypto = require('crypto');

/**
 * Creates a tracking link for a URL
 */
const createTrackingLink = async (userId, campaignId, mobile, originalUrl) => {
    if (!originalUrl || !String(originalUrl).startsWith('http')) return originalUrl;
    if (String(originalUrl).includes('/l/')) return originalUrl; // Avoid double wrapping
    
    try {
        const trackingId = crypto.randomBytes(6).toString('hex'); // Shorter ID for cleaner URLs
        await query(
            'INSERT INTO link_clicks (user_id, campaign_id, mobile, original_url, tracking_id) VALUES (?, ?, ?, ?, ?)',
            [userId, campaignId, mobile, originalUrl, trackingId]
        );
        
        // Use production URL fallback
        const baseUrl = process.env.API_BASE_URL || 'https://notifynow.in';
        return `${baseUrl}/api/l/${trackingId}`;
    } catch (e) {
        console.error('❌ Link Tracker Init Error:', e.message);
        return originalUrl;
    }
};

/**
 * Replaces placeholders [X] or {{X}} with values from index-based variables
 */
const replaceVariables = (text, vars) => {
    if (!text) return '';
    let result = String(text);

    // Regex to match all generic placeholders
    const regex = /\[\[([^\]]+)\]\]|\[([^\]]+)\]|\{\{([^}]+)\}\}|\{([^}]+)\}|\{#([^#]+)#\}/g;
    const counts = {};

    result = result.replace(regex, (match, p1, p2, p3, p4, p5) => {
        const key = (p1 || p2 || p3 || p4 || p5).trim();
        counts[key] = (counts[key] || 0) + 1;
        
        // Check if there is a specific mapped value for this occurrence
        let mappedKey = counts[key] === 1 ? key : `${key}_${counts[key]}`;
        
        if (vars[mappedKey] !== undefined && vars[mappedKey] !== '') {
            return vars[mappedKey];
        } else if (vars[key] !== undefined && vars[key] !== '') {
            // Fallback to the original base key if sequential mapping doesn't exist
            return vars[key];
        }
        return match; // Leave unreplaced if not found
    });

    return result;
};

/**
 * Maps variable_mapping JSON to values from contacts variables JSON (Smarter Fuzzy Mapping)
 */
const resolveMappedVariables = (mappingStr, contactVarsStr) => {
    try {
        const mapping = typeof mappingStr === 'string' ? JSON.parse(mappingStr || '{}') : (mappingStr || {});
        const contactVars = typeof contactVarsStr === 'string' ? JSON.parse(contactVarsStr || '{}') : (contactVarsStr || {});
        const resolved = {};

        // 1. Create a normalized lookup map for contact variables (lowercase + no spaces)
        const normalize = (s) => String(s).toLowerCase().replace(/[\s_-]/g, '');
        const normalizedVars = {};
        Object.keys(contactVars).forEach(k => {
            normalizedVars[normalize(k)] = contactVars[k];
        });
        
        // 2. Resolve explicitly mapped variables
        Object.keys(mapping).forEach(key => {
            const mapEntry = mapping[key];
            if (mapEntry && typeof mapEntry === 'object' && mapEntry.type) {
                if (mapEntry.type === 'field') {
                    resolved[key] = contactVars[mapEntry.value] || normalizedVars[normalize(mapEntry.value)] || '';
                } else if (mapEntry.type === 'custom') {
                    resolved[key] = mapEntry.value || '';
                }
            } else {
                const val = typeof mapEntry === 'string' ? mapEntry : key;
                resolved[key] = contactVars[val] || normalizedVars[normalize(val)] || '';
            }
        });

        // 3. Auto-fallback for common patterns (e.g. {{1}} looks for VAR1, 1, var_1)
        Object.assign(resolved, contactVars); // Keep original keys
        
        // Try filling numbered gaps if missing
        for (let i = 1; i <= 20; i++) {
            if (!resolved[i]) {
                const fuzzyVal = normalizedVars[normalize(`var${i}`)] || normalizedVars[normalize(i)] || normalizedVars[normalize(`variable${i}`)];
                if (fuzzyVal) resolved[i] = fuzzyVal;
            }
        }

        return resolved;
    } catch (e) {
        return {};
    }
};

/**
 * Scans text for {{1}}, {{name}}... and returns an array of values in that order.
 */
const getOrderedVariables = (text, resolvedVars) => {
    const vars = [];
    if (!text) return vars;
    // Regex for [[X]], [X], {{X}}, {X}, {#X#}
    const regex = /\[\[([^\]]+)\]\]|\[([^\]]+)\]|\{\{([^}]+)\}\}|\{([^}]+)\}|\{#([^#]+)#\}/g;
    let match;
    const foundKeys = [];
    const counts = {};
    
    while ((match = regex.exec(text)) !== null) {
        const key = (match[1] || match[2] || match[3] || match[4] || match[5]).trim();
        if (key) {
            counts[key] = (counts[key] || 0) + 1;
            let mappedKey = counts[key] === 1 ? key : `${key}_${counts[key]}`;
            foundKeys.push(mappedKey);
        }
    }

    // Attempt to handle all Numeric WA style first (e.g. {{1}}, {{2}})
    // But since we appended _2, we should just extract the base keys for numerical checks
    const baseKeys = foundKeys.map(k => k.split('_')[0]);
    const allNumeric = baseKeys.every(k => !isNaN(parseInt(k)));
    
    if (allNumeric && baseKeys.length > 0) {
        const indices = baseKeys.map(k => parseInt(k));
        const maxIdx = Math.max(...indices);
        const result = [];
        for (let i = 1; i <= maxIdx; i++) {
            result.push(resolvedVars[i] || '');
        }
        return result;
    }

    // For non-numeric (e.g. DLT variables, RCS names), return sequentially mapped values
    return foundKeys.map(k => {
        const baseKey = k.split('_')[0];
        return (resolvedVars[k] !== undefined && resolvedVars[k] !== '') ? resolvedVars[k] : (resolvedVars[baseKey] || '');
    });
};

/**
 * Universal Message Sender
 * @param {object} item - The campaign item from database
 * @returns {Promise<object>} - { success, messageId, error }
 */
/**
 * Helper to sync outbound campaign messages to chat history (webhook_logs)
 */
const logToChatHistory = async (userId, mobile, content, type, status, messageId) => {
    try {
        if (!userId || !mobile || !content) return;
        
        // Use the existing database query utility
        const { query } = require('../config/db');
        const cleanPhone = String(mobile).replace(/\D/g, '');
        
        await query(
            'INSERT INTO webhook_logs (user_id, sender, recipient, message_content, status, type, message_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [userId, 'System', cleanPhone, String(content), status, type, messageId]
        );
    } catch (err) {
        console.error('❌ Error syncing campaign message to chat history:', err.message);
    }
};

const sendUniversalMessage = async (item) => {
    let result = { success: false, error: 'Unknown Channel' };
    const channelParsed = (item.channel || '').toLowerCase();
    // 0. Resolve Variables (Handle both Manual and API queue naming)
    let rawVars = item.contact_variables || item.variables || {};
    if (typeof rawVars === 'string') {
        try { rawVars = JSON.parse(rawVars); } catch(e) { rawVars = {}; }
    }
    
    const resolvedVars = resolveMappedVariables(item.variable_mapping, rawVars);
    
    // 0.1 Force Media Header if provided in API but missing from mapping
    if (!resolvedVars.header_url && (rawVars.header_url || rawVars.mediaUrl)) {
        resolvedVars.header_url = rawVars.header_url || rawVars.mediaUrl;
    }

    try {
        if (channelParsed === 'rcs') {
            let processedMessage = '';
            
            // 1. Determine which RCS Config to use (Strict Routing)
            let targetConfigId = item.rcs_config_id;
            if (!targetConfigId) {
                const [userProfile] = await query('SELECT rcs_config_id FROM users WHERE id = ?', [item.user_id]);
                targetConfigId = userProfile[0]?.rcs_config_id;
            }

            if (!targetConfigId) {
                return { success: false, error: 'No RCS bot assigned to this user/campaign.' };
            }

            const [assignedConfigs] = await query('SELECT * FROM rcs_configs WHERE id = ? AND is_active = 1', [targetConfigId]);
            if (assignedConfigs.length === 0) {
                return { success: false, error: 'Assigned RCS bot is inactive or not found.' };
            }

            const rcsConfig = assignedConfigs[0];
            
            // 2. Send via RCS Service Helpers
            if (item.template_name && item.template_name.length > 2) {
                const body = item.template_body || '';
                const metaStr = typeof item.template_metadata === 'string' ? item.template_metadata : JSON.stringify(item.template_metadata || {});
                const customParams = getOrderedVariables(`${body} ${metaStr}`, resolvedVars);
                processedMessage = body || `Template: ${item.template_name}`;
                result = await sendRcsTemplate(item.mobile, item.template_name, rcsConfig, customParams);
            } else {
                const body = item.template_body || '';
                processedMessage = replaceVariables(body || item.campaign_name, resolvedVars);
                result = await sendRcsMessage(item.mobile, processedMessage, rcsConfig);
            }
            result.processedMessage = processedMessage;
        } 
        else if (channelParsed === 'whatsapp') {
            let processedMessage = item.template_body || '';
            let waConfig = item.whatsapp_config_id ? {
                provider: item.wa_provider, api_key: item.wa_api_key,
                wa_token: item.wa_token, ph_no_id: item.wa_ph_no_id,
                wa_biz_accnt_id: item.wa_biz_accnt_id
            } : null;

            // Fallback for older campaigns - Check user's assigned default bot
            if (!item.whatsapp_config_id) {
                const { query } = require('../config/db');
                const [users] = await query('SELECT whatsapp_config_id FROM users WHERE id = ?', [item.user_id]);
                const effectiveConfigId = users[0]?.whatsapp_config_id;
                
                if (effectiveConfigId) {
                    const [userBots] = await query('SELECT provider, api_key, wa_token, ph_no_id, wa_biz_accnt_id FROM whatsapp_configs WHERE id = ?', [effectiveConfigId]);
                    if (userBots.length > 0) {
                        waConfig = { ...userBots[0], wa_ph_no_id: userBots[0].ph_no_id };
                        console.log(`[SendingService] Using User's assigned WhatsApp config: ${waConfig.ph_no_id}`);
                    }
                }
            }

            // Final fallback if still null (not recommended)
            if (!waConfig) {
                const { query } = require('../config/db');
                const [userBots] = await query('SELECT provider, api_key, wa_token, ph_no_id, wa_biz_accnt_id FROM whatsapp_configs WHERE user_id = ? AND is_active = 1 LIMIT 1', [item.user_id]);
                if (userBots.length > 0) {
                    waConfig = { ...userBots[0], wa_ph_no_id: userBots[0].ph_no_id };
                    console.log(`[SendingService] Using fallback WhatsApp config: ${waConfig.provider}`);
                }
            }

            if (!waConfig) return { success: false, error: 'No WhatsApp configuration available' };

            const isPinbot = waConfig.provider === 'vendor2';
            const headers = isPinbot 
                ? { apikey: waConfig.api_key, 'Content-Type': 'application/json' }
                : { Authorization: `Bearer ${waConfig.wa_token}`, 'Content-Type': 'application/json' };
            
            const PINBOT_BASE = 'https://partnersv1.pinbot.ai/v3';
            const GRAPH_BASE = 'https://graph.facebook.com/v19.0';
            const msgUrl = isPinbot 
                ? `${PINBOT_BASE}/${waConfig.ph_no_id}/messages`
                : `${GRAPH_BASE}/${waConfig.ph_no_id}/messages`;

            // Extract language from metadata if available
            let langCode = 'en_US';
            let meta = {};
            try { 
                meta = typeof item.template_metadata === 'string' ? JSON.parse(item.template_metadata) : (item.template_metadata || {}); 
                if (meta.language) langCode = meta.language;
                else if (meta.languageCode) langCode = meta.languageCode;
            } catch(e) {}

            const payload = {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: item.mobile.replace(/\D/g, ''),
                type: 'template',
                template: {
                    name: item.template_name || item.template_id,
                    language: { code: langCode }
                }
            };

            const mtComponents = meta.components || [];
            const payloadComponents = [];
            const bodyComp   = mtComponents.find(c => c.type?.toUpperCase() === 'BODY');
            const headerComp = mtComponents.find(c => c.type?.toUpperCase() === 'HEADER');

            // ── HEADER COMPONENT ──────────────────────────────────────
            let headerFormat = (headerComp?.format || '').toUpperCase();
            const headerUrl = resolvedVars['header_url'] || resolvedVars['headerUrl'] ||
                              resolvedVars['image_url'] || resolvedVars['imageUrl'] ||
                              meta.header_url || meta.headerUrl || meta.sampleMediaUrl ||
                              meta.example?.header_handle?.[0] || 
                              headerComp?.example?.header_handle?.[0] || null;

            // Robust Fallback: If headerUrl exists but headerComp is missing or unknown, auto-detect type
            if (!headerFormat && headerUrl) {
                const urlLower = String(headerUrl).toLowerCase();
                if (urlLower.match(/\.(mp4|3gp|m4v)$/)) headerFormat = 'VIDEO';
                else if (urlLower.match(/\.(pdf|doc|docx|ppt|pptx|xlsx|xls)$/)) headerFormat = 'DOCUMENT';
                else headerFormat = 'IMAGE'; 
            }

            if (headerFormat === 'IMAGE' && headerUrl) {
                payloadComponents.push({ 
                    type: 'header', 
                    parameters: [{ type: 'image', image: { link: headerUrl } }] 
                });
            } else if (headerFormat === 'VIDEO' && headerUrl) {
                payloadComponents.push({ 
                    type: 'header', 
                    parameters: [{ type: 'video', video: { link: headerUrl } }] 
                });
            } else if (headerFormat === 'DOCUMENT' && headerUrl) {
                payloadComponents.push({ 
                    type: 'header', 
                    parameters: [{ type: 'document', document: { link: String(headerUrl), filename: 'document' } }] 
                });
            } else if (headerFormat === 'TEXT' || (headerComp && headerComp.text)) {
                const headerText = getOrderedVariables(headerComp?.text || '', resolvedVars);
                if (headerText.length > 0) {
                    payloadComponents.push({ 
                        type: 'header', 
                        parameters: headerText.map(v => ({ type: 'text', text: String(v || ' ') })) 
                    });
                }
            }

            // ── BODY COMPONENT ────────────────────────────────────────
            let waParams = getOrderedVariables(bodyComp?.text || item.template_body || '', resolvedVars);
            
            // 🔗 Link Tracking: Wrap URLs in waParams for engagement tracking
            for (let i = 0; i < waParams.length; i++) {
                if (String(waParams[i] || '').startsWith('http')) {
                    waParams[i] = await createTrackingLink(item.user_id, item.campaign_id, item.mobile, waParams[i], req?.io);
                }
            }
            
            // Log for debugging
            console.log(`[WA-DEBUG] Mobile: ${item.mobile} | ResolvedVars: ${JSON.stringify(resolvedVars)}`);

            // Fix for API desync: Check if we have ANY numeric keys (string "1" or number 1)
            if (waParams.length === 0) {
                const numericKeys = Object.keys(resolvedVars)
                                          .filter(k => {
                                              const n = parseInt(k);
                                              return !isNaN(n) && n > 0 && n < 50;
                                          })
                                          .sort((a, b) => parseInt(a) - parseInt(b));
                
                if (numericKeys.length > 0) {
                    // Filter out duplicates (if both "1" and 1 exist)
                    const uniqueIndices = [...new Set(numericKeys.map(k => parseInt(k)))].sort((a, b) => a - b);
                    waParams = uniqueIndices.map(idx => resolvedVars[idx] || resolvedVars[String(idx)]);
                    console.log(`[WA-DEBUG] Falling back to numeric params: ${JSON.stringify(waParams)}`);
                }
            }

            if (waParams.length > 0) {
                // Fix for Error #131008: Parameter of type text is missing text value
                // Meta requires non-empty strings for all variables.
                payloadComponents.push({ 
                    type: 'body', 
                    parameters: waParams.map((v, idx) => {
                        const val = String(v || ' ').trim();
                        return { type: 'text', text: val === '' ? ' ' : val };
                    }) 
                });
                
                // Construct a readable version for logging
                let bodyText = bodyComp?.text || item.template_body || '';
                waParams.forEach((val, i) => {
                    const placeholder = `{{${i+1}}}`;
                    if (bodyText.includes(placeholder)) {
                        bodyText = bodyText.split(placeholder).join(val || ' ');
                    }
                });
                processedMessage = bodyText;
            }

            // ── BUTTON COMPONENTS ──────────────────────────────────────
            const buttonComponents = mtComponents.filter(c => c.type?.toUpperCase() === 'BUTTONS' || c.type?.toUpperCase() === 'BUTTON');
            for (let bIndex = 0; bIndex < buttonComponents.length; bIndex++) {
                const bComp = buttonComponents[bIndex];
                if (!bComp.buttons) continue;

                for (let i = 0; i < bComp.buttons.length; i++) {
                    const btn = bComp.buttons[i];
                    if (btn.type?.toUpperCase() === 'URL') {
                        let btnVars = getOrderedVariables(btn.url || '', resolvedVars);
                        if (btnVars.length > 0) {
                            // Force tracking for button variables (since they are URL components)
                            for (let j = 0; j < btnVars.length; j++) {
                                btnVars[j] = await createTrackingLink(item.user_id, item.campaign_id, item.mobile, btnVars[j]);
                            }

                            payloadComponents.push({
                                type: 'button',
                                sub_type: 'url',
                                index: String(i),
                                parameters: btnVars.map(v => ({ type: 'text', text: String(v || ' ') }))
                            });
                        }
                    }
                }
            }

            // ── FINAL PAYLOAD CONSTRUCTION ────────────────────────────
            if (payloadComponents.length > 0) {
                payload.template.components = payloadComponents;
            }

            // Force Media Header for Pinbot if provided but metadata sync failed
            if (isPinbot && headerUrl && !payloadComponents.find(c => c.type === 'header')) {
                const urlLower = String(headerUrl).toLowerCase();
                let mediaType = 'image';
                if (urlLower.match(/\.(mp4|3gp|m4v)$/)) mediaType = 'video';
                else if (urlLower.match(/\.(pdf|doc|docx|ppt|pptx|xlsx|xls)$/)) mediaType = 'document';
                
                if (!payload.template.components) payload.template.components = [];
                payload.template.components.unshift({
                    type: 'header',
                    parameters: [{ type: mediaType, [mediaType]: { link: headerUrl } }]
                });
            }

            console.log(`[Meta] Sending via Bot: ${waConfig.ph_no_id} | Template: ${payload.template.name} | Payload: ${JSON.stringify(payload)}`);

            const response = await axios.post(msgUrl, payload, { headers });
            const respData = response.data;
            result = { 
                success: true, 
                messageId: respData.messages?.[0]?.id || respData.message_id || `wa_${Date.now()}_${item.mobile}`,
                processedMessage
            };
        } 
        else if (channelParsed === 'email') {
            const body = item.template_body || '';
            const subjectTemplate = item.template_subject || 'Notification from NotifyNow';
            const processedMessage = replaceVariables(body, resolvedVars);
            const processedSubject = replaceVariables(subjectTemplate, resolvedVars);

            // 1. Resolve Strict Email Config
            let targetConfigId = item.email_config_id;
            if (!targetConfigId) {
                const [u] = await query('SELECT email_config_id FROM users WHERE id = ?', [item.user_id]);
                targetConfigId = u[0]?.email_config_id;
            }

            if (!targetConfigId) return { success: false, error: 'No Email configuration assigned' };

            const [configs] = await query('SELECT * FROM email_configs WHERE id = ? AND is_active = 1', [targetConfigId]);
            if (!configs.length) return { success: false, error: 'Assigned email configuration not found or inactive' };
            const emailConfig = configs[0];

            // 2. Send via Email Service
            try {
                const emailResult = await sendEmail(item.mobile, processedSubject, processedMessage, emailConfig);
                result = { 
                    success: true, 
                    messageId: emailResult.messageId, 
                    processedMessage: processedMessage 
                };
            } catch (err) {
                result = { success: false, error: `Email Error: ${err.message}` };
            }
        }
        else if (channelParsed === 'sms') {
            const body = item.template_body || item.campaign_name;
            const processedMessage = replaceVariables(body, resolvedVars);
            
            // Extract DLT metadata from template metadata OR direct columns (via COALESCE in SQL)
            let peId = item.pe_id || '';
            let hashId = item.hash_id || '';
            let templateId = item.template_id || ''; // This is template ID
            let sender = item.sender || null;
            let isUnicode = false;
            let isTrackLink = false;

            try {
                const meta = typeof item.template_metadata === 'string' ? JSON.parse(item.template_metadata) : (item.template_metadata || {});
                peId = meta.peId || meta.pe_id || peId;
                hashId = meta.hashId || meta.hash_id || hashId;
                templateId = meta.templateId || meta.template_id || templateId;
                sender = meta.sender || sender;
                isUnicode = !!meta.is_unicode;
                isTrackLink = !!meta.is_track_link;
            } catch(e) {}

            // Short URL link tracking replacement logic 
            // In future: Replace real URLs with a short link server endpoint inside processedMessage if isTrackLink is true
            
            const smsResult = await sendSMS(item.mobile, processedMessage, { 
                userId: item.user_id, 
                templateId, 
                peId, 
                hashId,
                sender, // Priority 1: Template/Campaign Header
                isUnicode,
                isTrackLink
            });
            
            result = { 
                success: smsResult.success, 
                messageId: smsResult.messageId || `sms_${Date.now()}_${item.mobile.slice(-4)}`,
                processedMessage,
                error: smsResult.error 
            };
        }
        else if (channelParsed === 'voicebot' || channelParsed === 'voice') {
            const meta = typeof item.template_metadata === 'string' ? JSON.parse(item.template_metadata || '{}') : (item.template_metadata || {});
            
            // audioId can be stored in template_id or passed via body
            const audioId = item.template_id || meta.audioId || meta.audio_id || item.template_body;
            
            const options = {
                retries: meta.retries || 2,
                interval: meta.retry_interval || meta.interval || 5,
                campaignId: item.campaign_id,
                userId: item.user_id
            };

            const voiceConfig = {
                api_user: item.api_user || "Idpupil2024",
                api_password: item.api_password || "apipupil2024"
            };

            const { sendVoiceCall } = require('./voiceService');
            result = await sendVoiceCall(item.mobile, audioId, options, voiceConfig);
            result.processedMessage = `Voice Call (Audio ID: ${audioId})`;
        }

        // --- NEW: Sync Outbound Message to Chat History (Conversations) ---
        if (result.success && ['whatsapp', 'rcs', 'sms'].includes(channelParsed)) {
            // Background sync so it doesn't slow down the main sending loop
            logToChatHistory(
                item.user_id, 
                item.mobile, 
                result.processedMessage || item.template_body || 'Message Sent', 
                channelParsed, 
                'sent', 
                result.messageId
            ).catch(e => console.error('Chat Sync Failed:', e.message));
        }

        return result;
    } catch (err) {
        let errorDetail = err.message;
        if (err.response?.data) {
            const data = err.response.data;
            if (typeof data === 'object') {
                errorDetail = data.reason || data.message || data.error || 
                              (data.error?.message) || (data.error_data?.details) || 
                              JSON.stringify(data);
            } else if (typeof data === 'string') {
                errorDetail = data;
            }
        }
        const finalError = typeof errorDetail === 'object' ? JSON.stringify(errorDetail) : String(errorDetail);
        console.error(`[SendingService] Error:`, finalError);
        return { success: false, error: finalError };
    }
};

module.exports = {
    sendUniversalMessage,
    resolveMappedVariables,
    getOrderedVariables,
    replaceVariables
};
