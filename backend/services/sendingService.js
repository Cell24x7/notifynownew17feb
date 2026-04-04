const axios = require('axios');
const { query } = require('../config/db');
const { sendRcsTemplate, sendRcsMessage } = require('./rcsService');
const { sendSMS } = require('../utils/smsService');

/**
 * Replaces placeholders [X] or {{X}} with values from index-based variables
 */
const replaceVariables = (text, vars) => {
    if (!text) return '';
    let result = String(text);
    Object.keys(vars).forEach(key => {
        const value = vars[key] || '';
        result = result.split(`[${key}]`).join(value);
        result = result.split(`{{${key}}}`).join(value);
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
    // Regex for both [[X]], [X], {{X}}
    const regex = /\[\[([^\]]+)\]\]|\[([^\]]+)\]|\{\{([^}]+)\}\}/g;
    let match;
    const foundKeys = [];
    const seen = new Set();
    
    while ((match = regex.exec(text)) !== null) {
        const key = (match[1] || match[2] || match[3]).trim();
        if (key && !seen.has(key)) {
            foundKeys.push(key);
            seen.add(key);
        }
    }

    // If all keys are numeric, return a continuous array [1..maxIndex]
    const allNumeric = foundKeys.every(k => !isNaN(parseInt(k)));
    if (allNumeric && foundKeys.length > 0) {
        const indices = foundKeys.map(k => parseInt(k));
        const maxIdx = Math.max(...indices);
        const result = [];
        for (let i = 1; i <= maxIdx; i++) {
            result.push(resolvedVars[i] || '');
        }
        return result;
    }

    return foundKeys.map(k => resolvedVars[k] || '');
};

/**
 * Universal Message Sender
 * @param {object} item - The campaign item from database
 * @returns {Promise<object>} - { success, messageId, error }
 */
const sendUniversalMessage = async (item) => {
    let result = { success: false, error: 'Unknown Channel' };
    const channelParsed = (item.channel || '').toLowerCase();
    const resolvedVars = resolveMappedVariables(item.variable_mapping, item.variables);

    try {
        if (channelParsed === 'rcs') {
            let rcsConfig = item.rcs_config_id ? {
                id: item.rcs_config_id, name: item.rcs_config_name,
                auth_url: item.auth_url, api_base_url: item.api_base_url,
                client_id: item.client_id, client_secret: item.client_secret, bot_id: item.bot_id
            } : null;

            // Fallback: Use first active RCS config if user has none assigned
            if (!rcsConfig) {
                const [defaults] = await query('SELECT * FROM rcs_configs WHERE is_active = 1 LIMIT 1');
                if (defaults.length > 0) {
                    rcsConfig = defaults[0];
                    console.log(`[SendingService] Using fallback RCS config: ${rcsConfig.name}`);
                }
            }

            if (item.template_name && item.template_name.length > 5) {
                const body = item.template_body || '';
                const metaStr = typeof item.template_metadata === 'string' ? item.template_metadata : JSON.stringify(item.template_metadata || {});
                const customParams = getOrderedVariables(`${body} ${metaStr}`, resolvedVars);
                result = await sendRcsTemplate(item.mobile, item.template_name, rcsConfig, customParams);
            } else {
                const body = item.template_body || '';
                const msg = replaceVariables(body || item.campaign_name, resolvedVars);
                result = await sendRcsMessage(item.mobile, msg, rcsConfig);
            }
        } 
        else if (channelParsed === 'whatsapp') {
            let waConfig = item.whatsapp_config_id ? {
                provider: item.wa_provider, api_key: item.wa_api_key,
                wa_token: item.wa_token, ph_no_id: item.wa_ph_no_id,
                wa_biz_accnt_id: item.wa_biz_accnt_id
            } : null;

            // Fallback: Use system WhatsApp config if missing
            if (!waConfig) {
                const [defaults] = await query('SELECT * FROM whatsapp_configs WHERE is_active = 1 LIMIT 1');
                if (defaults.length > 0) {
                    waConfig = defaults[0];
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
                to: item.mobile.replace(/\D/g, ''), // Ensure clean numeric mobile
                type: 'template',
                template: {
                    name: item.template_name,
                    language: { code: langCode } 
                }
            };

            const payloadComponents = [];
            const mtComponents = meta.components || [];
            const bodyComp   = mtComponents.find(c => c.type?.toUpperCase() === 'BODY');
            const headerComp = mtComponents.find(c => c.type?.toUpperCase() === 'HEADER');

            // ── HEADER COMPONENT ──────────────────────────────────────
            if (headerComp) {
                const headerFormat = (headerComp.format || '').toUpperCase(); // IMAGE, VIDEO, DOCUMENT, TEXT
                // header_url can come from: resolvedVars, variables JSON, or template metadata
                const headerUrl = resolvedVars['header_url'] || resolvedVars['headerUrl'] ||
                                  resolvedVars['image_url'] || resolvedVars['imageUrl'] ||
                                  meta.header_url || meta.headerUrl || meta.sampleMediaUrl ||
                                  headerComp.example?.header_handle?.[0] || null;

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
                        parameters: [{ type: 'document', document: { link: headerUrl } }] 
                    });
                } else if (headerFormat === 'TEXT') {
                    const headerText = getOrderedVariables(headerComp.text || '', resolvedVars);
                    if (headerText.length > 0) {
                        payloadComponents.push({ 
                            type: 'header', 
                            parameters: headerText.map(v => ({ type: 'text', text: String(v) })) 
                        });
                    }
                }
                // If headerFormat is IMAGE/VIDEO/DOCUMENT but no URL → skip (WhatsApp will use template default)
            }

            // ── BODY COMPONENT ────────────────────────────────────────
            const waParams = getOrderedVariables(bodyComp?.text || item.template_body || '', resolvedVars);
            if (waParams.length > 0) {
                payloadComponents.push({ type: 'body', parameters: waParams.map(v => ({ type: 'text', text: String(v) })) });
            }

            if (payloadComponents.length > 0) payload.template.components = payloadComponents;

            const response = await axios.post(msgUrl, payload, { headers });
            const respData = response.data;
            result = { 
                success: true, 
                messageId: respData.messages?.[0]?.id || respData.message_id || `wa_${Date.now()}_${item.mobile}` 
            };
        } 
        else if (channelParsed === 'sms') {
            const body = item.template_body || item.campaign_name;
            const customMessage = replaceVariables(body, resolvedVars);
            
            // Extract DLT metadata from template metadata OR direct columns (via COALESCE in SQL)
            let peId = item.pe_id || '';
            let hashId = item.hash_id || '';
            let templateId = item.template_id || ''; // This is template ID
            const sender = item.sender || null;

            try {
                const meta = typeof item.template_metadata === 'string' ? JSON.parse(item.template_metadata) : (item.template_metadata || {});
                peId = meta.peId || meta.pe_id || peId;
                hashId = meta.hashId || meta.hash_id || hashId;
                templateId = meta.templateId || meta.template_id || templateId;
            } catch(e) {}

            const smsResult = await sendSMS(item.mobile, customMessage, { 
                userId: item.user_id, 
                templateId, 
                peId, 
                hashId,
                sender // Priority 1: Template/Campaign Header
            });
            
            result = { 
                success: smsResult.success, 
                messageId: smsResult.messageId || `sms_${Date.now()}_${item.mobile.slice(-4)}`,
                error: smsResult.error 
            };
        }

        return result;
    } catch (err) {
        const errorDetail = err.response?.data ? JSON.stringify(err.response.data) : err.message;
        console.error(`[SendingService] Error:`, errorDetail);
        return { success: false, error: errorDetail };
    }
};

module.exports = {
    sendUniversalMessage,
    resolveMappedVariables,
    getOrderedVariables,
    replaceVariables
};
