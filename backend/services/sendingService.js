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
 * Maps variable_mapping JSON to values from contacts variables JSON
 */
const resolveMappedVariables = (mappingStr, contactVarsStr) => {
    try {
        const mapping = typeof mappingStr === 'string' ? JSON.parse(mappingStr || '{}') : (mappingStr || {});
        const contactVars = typeof contactVarsStr === 'string' ? JSON.parse(contactVarsStr || '{}') : (contactVarsStr || {});
        const resolved = {};
        
        if (Object.keys(mapping).length > 0) {
            Object.keys(mapping).forEach(key => {
                const mapEntry = mapping[key];
                if (mapEntry && typeof mapEntry === 'object' && mapEntry.type) {
                    if (mapEntry.type === 'field') {
                        resolved[key] = contactVars[mapEntry.value] || '';
                    } else if (mapEntry.type === 'custom') {
                        resolved[key] = mapEntry.value || '';
                    }
                } else if (typeof mapEntry === 'string') {
                    resolved[key] = contactVars[mapEntry] || '';
                }
            });
        } 
        Object.assign(resolved, contactVars);
        return resolved;
    } catch (e) {
        return {};
    }
};

/**
 * Scans text for {{1}}, {{2}}... and returns an array of values in that order.
 */
const getOrderedVariables = (text, resolvedVars) => {
    const vars = [];
    if (!text) return vars;
    const regex = /\[(\d+)\]|\{\{(\d+)\}\}/g;
    let match;
    const foundIndices = new Set();
    while ((match = regex.exec(text)) !== null) {
        const idx = match[1] || match[2];
        if (idx) foundIndices.add(idx);
    }
    const sorted = Array.from(foundIndices).sort((a, b) => parseInt(a) - parseInt(b));
    return sorted.map(idx => resolvedVars[idx] || '');
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
            const bodyComp = mtComponents.find(c => c.type === 'BODY' || c.type === 'body');
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
            let templateId = item.raw_template_id || '', peId = '', hashId = '';
            try {
                const meta = typeof item.template_metadata === 'string' ? JSON.parse(item.template_metadata) : (item.template_metadata || {});
                templateId = meta.templateId || meta.dlt_template_id || templateId;
                peId = meta.peId || meta.pe_id || '';
                hashId = meta.hashId || meta.hash_id || '';
            } catch(e) {}
            await sendSMS(item.mobile, customMessage, { userId: item.user_id, templateId, peId, hashId });
            result = { success: true, messageId: `sms_${Date.now()}_${item.mobile.slice(-4)}` };
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
