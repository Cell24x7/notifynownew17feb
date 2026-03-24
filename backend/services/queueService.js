const axios = require('axios');
const { query } = require('../config/db');
const { deductCampaignCredits } = require('./walletService');
const { sendRcsTemplate, sendRcsMessage } = require('./rcsService');
const { sendSMS } = require('../utils/smsService');

const BATCH_SIZE = 200;
const GRAPH_BASE = 'https://graph.facebook.com/v19.0';
const PINBOT_BASE = 'https://partnersv1.pinbot.ai/v3';

/**
 * Normalizes RCS results from service
 */
const normalizeRcsResult = (raw) => {
    if (raw && raw.messageId) return { success: true, messageId: raw.messageId };
    if (raw && raw.id) return { success: true, messageId: raw.id };
    return { success: false, error: raw?.error || 'RCS message sending failed' };
};

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
 * Maps variable_mapping JSON (e.g., {"1": "Name"}) to values from contacts variables JSON (e.g., {"Name": "Sandeep"})
 */
const resolveMappedVariables = (mappingStr, contactVarsStr) => {
    try {
        const mapping = typeof mappingStr === 'string' ? JSON.parse(mappingStr || '{}') : (mappingStr || {});
        const contactVars = typeof contactVarsStr === 'string' ? JSON.parse(contactVarsStr || '{}') : (contactVarsStr || {});
        const resolved = {};
        
        // Strategy 1: Mapping exists
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
                    // Fallback for simple string mapping
                    resolved[key] = contactVars[mapEntry] || '';
                }
            });
        } 
        
        // Strategy 2: Direct merge (for API-driven campaigns where variables are already "1", "2")
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
    // Regex for both [X] and {{X}}
    const regex = /\[(\d+)\]|\{\{(\d+)\}\}/g;
    let match;
    const foundIndices = new Set();
    while ((match = regex.exec(text)) !== null) {
        const idx = match[1] || match[2];
        if (idx) foundIndices.add(idx);
    }
    
    // Sort indices numerically and get values
    const sorted = Array.from(foundIndices).sort((a, b) => parseInt(a) - parseInt(b));
    return sorted.map(idx => resolvedVars[idx] || '');
};

const calculateNextRun = (currentRun, frequency, repeatDays) => {
    if (!currentRun) return null;
    const next = new Date(currentRun);
    
    if (frequency === 'daily') {
        next.setDate(next.getDate() + 1);
    } else if (frequency === 'weekly') {
        if (!repeatDays || !Array.isArray(repeatDays) || repeatDays.length === 0) {
            next.setDate(next.getDate() + 7); // Default to same day next week
        } else {
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const currentDayIdx = next.getDay();
            
            let minDiff = 8;
            repeatDays.forEach(day => {
                const targetIdx = days.findIndex(d => d.startsWith(day));
                if (targetIdx !== -1) {
                    let diff = targetIdx - currentDayIdx;
                    if (diff <= 0) diff += 7;
                    if (diff < minDiff) minDiff = diff;
                }
            });
            next.setDate(next.getDate() + minDiff);
        }
    } else if (frequency === 'monthly') {
        next.setMonth(next.getMonth() + 1);
    } else {
        return null;
    }
    return next;
};

/**
 * Core processor for any campaign queue
 */
const processBatch = async (tableConfig) => {
    const { 
        campaignTable, 
        queueTable, 
        logsTable,
        name: processorName
    } = tableConfig;

    try {
        // --- 1. Handle Recurring Campaigns Renewal (Resetting previously finished runs) ---
        // Currently only supported for manual campaigns
        if (campaignTable === 'campaigns') {
            const [recurringCamps] = await query(`
                SELECT * FROM ${campaignTable} 
                WHERE scheduling_mode = 'repeat' 
                AND status = 'sent' 
                AND next_run_at <= NOW()
                AND (end_date IS NULL OR end_date > NOW())
            `);

            for (const camp of recurringCamps) {
                console.log(`♻️ [${processorName}] Renewing recurring campaign ${camp.id} (${camp.name})`);
                
                // Reset queue items to pending
                await query(`UPDATE ${queueTable} SET status = "pending" WHERE campaign_id = ?`, [camp.id]);
                
                // Calculate next run
                const nextRun = calculateNextRun(camp.next_run_at, camp.frequency, camp.repeat_days);
                
                // Set status back to 'running'
                await query(
                    `UPDATE ${campaignTable} SET status = "running", next_run_at = ?, last_run_at = NOW() WHERE id = ?`, 
                    [nextRun, camp.id]
                );
            }
        }

        // --- 2. Auto-start scheduled/pending campaigns whose time has passed ---
        await query(`
            UPDATE ${campaignTable} 
            SET status = 'running', last_run_at = NOW()
            WHERE status IN ('scheduled', 'draft') 
            AND next_run_at <= NOW()
            AND status != 'running'
        `);

        // 3. Fetch pending items
        const sql = `
            SELECT q.id, q.campaign_id, q.mobile, 
            COALESCE(mt.name, c.template_name) as template_name,
            COALESCE(mt.body, c.template_body) as template_body,
            mt.template_type, 
            COALESCE(mt.metadata, c.template_metadata) as template_metadata,
            c.name as campaign_name, c.channel, c.user_id, c.credits_deducted, c.variable_mapping, c.template_id as raw_template_id,
            u.rcs_config_id, u.whatsapp_config_id, q.variables,
            rc.name as rcs_config_name, rc.auth_url, rc.api_base_url, 
            rc.client_id, rc.client_secret, rc.bot_id,
            wc.provider as wa_provider, wc.wa_token, wc.api_key as wa_api_key,
            wc.ph_no_id as wa_ph_no_id, wc.wa_biz_accnt_id
            FROM ${queueTable} q
            JOIN ${campaignTable} c ON q.campaign_id = c.id
            JOIN users u ON c.user_id = u.id
            LEFT JOIN rcs_configs rc ON u.rcs_config_id = rc.id
            LEFT JOIN whatsapp_configs wc ON u.whatsapp_config_id = wc.id
            LEFT JOIN message_templates mt ON (c.template_id = mt.id OR (c.template_id = mt.name AND c.user_id = mt.user_id))
            WHERE q.status = 'pending' AND c.status = 'running'
            LIMIT ?
        `;

        let [items] = await query(sql, [BATCH_SIZE]);
        if (items.length === 0) return;

        // Safety Deduct Credits
        const uniqueCampaigns = [...new Set(items.filter(i => !i.credits_deducted).map(i => i.campaign_id))];
        const failedCampaigns = new Set();
        for (const campId of uniqueCampaigns) {
            const result = await deductCampaignCredits(campId, campaignTable);
            if (!result.success) {
                console.error(`[${processorName}] Credit deduction failed for ${campId}: ${result.message}`);
                await query(`UPDATE ${campaignTable} SET status = "paused" WHERE id = ?`, [campId]);
                failedCampaigns.add(campId);
            }
        }

        if (failedCampaigns.size > 0) items = items.filter(i => !failedCampaigns.has(i.campaign_id));
        if (items.length === 0) return;

        console.log(`[${processorName}] Offloading ${items.length} items to BullMQ 1Cr+ Engine...`);
        const { campaignQueue } = require('../queues/campaignQueue');

        // PUSH TO REDIS (FAST)
        const jobs = items.map(item => ({
            name: `sending-${item.mobile}`,
            data: { item, tableConfig },
            opts: { jobId: `${processorName}-${item.id}` } // Avoid duplicate sends
        }));
        
        await campaignQueue.addBulk(jobs);

        // MARK AS PROCESSING IN SQL
        const itemIds = items.map(i => i.id);
        await query(`UPDATE ${queueTable} SET status = "processing" WHERE id IN (?)`, [itemIds]);
        return;

        // --- OLD IN-THREAD LOGIC (Bypassed by Redis) ---
        const stats = {};
        const results = [];

        await Promise.all(items.map(async (item) => {
            if (!stats[item.campaign_id]) stats[item.campaign_id] = { sent: 0, failed: 0 };
            let result = { success: false, error: 'Unknown' };

            try {
                const resolvedVars = resolveMappedVariables(item.variable_mapping, item.variables);
                const channelParsed = (item.channel || '').toLowerCase();

                if (channelParsed === 'rcs') {
                    const userConfig = item.rcs_config_id ? {
                        id: item.rcs_config_id, name: item.rcs_config_name,
                        auth_url: item.auth_url, api_base_url: item.api_base_url,
                        client_id: item.client_id, client_secret: item.client_secret, bot_id: item.bot_id
                    } : null;

                    const body = item.template_body || '';
                    const meta = typeof item.template_metadata === 'string' ? item.template_metadata : JSON.stringify(item.template_metadata || {});
                    
                    if (item.template_name && item.template_name.length > 5) {
                        const customParams = getOrderedVariables(`${body} ${meta}`, resolvedVars);
                        const raw = await sendRcsTemplate(item.mobile, item.template_name, userConfig, customParams);
                        result = normalizeRcsResult(raw);
                    } else {
                        const msg = replaceVariables(body || item.campaign_name, resolvedVars);
                        const rawText = await sendRcsMessage(item.mobile, msg, userConfig);
                        result = normalizeRcsResult(rawText);
                    }
                } else if (channelParsed === 'whatsapp') {
                    if (!item.whatsapp_config_id) {
                        result = { success: false, error: 'No WhatsApp configuration' };
                    } else {
                        const isPinbot = item.wa_provider === 'vendor2';
                        
                        if (!item.wa_ph_no_id) {
                            result = { success: false, error: 'Missing Message ID (ph_no_id) for user config' };
                        } else {
                            const msgUrl = isPinbot ? `${PINBOT_BASE}/${item.wa_ph_no_id}/messages` : `${GRAPH_BASE}/${item.wa_ph_no_id}/messages`;
                            const headers = isPinbot ? { apikey: item.wa_api_key, 'Content-Type': 'application/json' } : { Authorization: `Bearer ${item.wa_token}`, 'Content-Type': 'application/json' };

                        let mobile = item.mobile.replace(/\D/g, '');
                        if (mobile.length === 10) mobile = '91' + mobile;

                        let langCode = 'en_US';
                        try {
                            const meta = typeof item.template_metadata === 'string' ? JSON.parse(item.template_metadata) : (item.template_metadata || {});
                            if (meta.language) langCode = meta.language;
                        } catch(e) {}

                        const payload = {
                            messaging_product: 'whatsapp', recipient_type: 'individual', to: mobile, type: 'template',
                            template: { name: item.template_name, language: { code: langCode } }
                        };

                        const payloadComponents = [];
                        const meta = typeof item.template_metadata === 'string' ? JSON.parse(item.template_metadata) : (item.template_metadata || {});
                        const mtComponents = meta.components || [];

                        const bodyComp = mtComponents.find(c => c.type === 'BODY' || c.type === 'body');
                        const waParams = getOrderedVariables(bodyComp?.text || item.template_body || '', resolvedVars);
                        
                        // Header
                        const headerComp = mtComponents.find(c => c.type === 'HEADER' || c.type === 'header');
                        if (headerComp) {
                            if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerComp.format?.toUpperCase())) {
                                const mediaType = headerComp.format.toLowerCase();
                                let dynamicHeader = String(resolvedVars['header_url'] || headerComp.example?.header_handle?.[0] || '');
                                if (dynamicHeader.startsWith('4::') && headerComp.file_url) dynamicHeader = headerComp.file_url;
                                if (dynamicHeader) {
                                    payloadComponents.push({
                                        type: 'header', parameters: [{ type: mediaType, [mediaType]: dynamicHeader.startsWith('http') ? { link: dynamicHeader } : { id: dynamicHeader } }]
                                    });
                                }
                            } else if (headerComp.format?.toUpperCase() === 'TEXT') {
                                const headParams = getOrderedVariables(headerComp.text, resolvedVars);
                                if (headParams.length > 0) payloadComponents.push({ type: 'header', parameters: headParams.map(v => ({ type: 'text', text: String(v) })) });
                            }
                        }

                        if (waParams.length > 0) payloadComponents.push({ type: 'body', parameters: waParams.map(v => ({ type: 'text', text: String(v) })) });

                        // Buttons
                        const buttonComp = mtComponents.find(c => c.type === 'BUTTONS' || c.type === 'buttons');
                        if (buttonComp?.buttons) {
                            buttonComp.buttons.forEach((btn, idx) => {
                                if (btn.type === 'URL') {
                                    const btnValue = resolvedVars[`button_${idx + 1}_url`];
                                    if (btnValue) payloadComponents.push({ type: 'button', sub_type: 'url', index: String(idx), parameters: [{ type: 'text', text: String(btnValue) }] });
                                    else {
                                        const btnParams = getOrderedVariables(btn.url, resolvedVars);
                                        if (btnParams.length > 0) payloadComponents.push({ type: 'button', sub_type: 'url', index: String(idx), parameters: btnParams.map(v => ({ type: 'text', text: String(v) })) });
                                    }
                                }
                            });
                        }
                        if (payloadComponents.length > 0) payload.template.components = payloadComponents;
                        
                        console.log(`[WA-SEND] Endpoint: ${msgUrl}`);
                        console.log(`[WA-SEND] Payload: ${JSON.stringify(payload, null, 2)}`);
                        
                        const response = await axios.post(msgUrl, payload, { headers });
                        const respData = response.data;
                        result = { success: true, messageId: respData.messages?.[0]?.id || respData.message_id || `wa_${Date.now()}_${mobile}` };
                        }
                    }
                } else if (channelParsed === 'sms') {
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

                results.push({ ...item, success: result.success, messageId: result.messageId, error: result.error });
                if (result.success) stats[item.campaign_id].sent++;
                else stats[item.campaign_id].failed++;

            } catch (err) {
                const errorDetail = err.response?.data ? JSON.stringify(err.response.data) : err.message;
                console.error(`[${processorName}] Item Error ${item.id}:`, errorDetail);
                results.push({ ...item, success: false, error: errorDetail });
                stats[item.campaign_id].failed++;
            }
        }));

        // Database updates
        for (const r of results) {
            if (r.success) {
                await query(`UPDATE ${queueTable} SET status = "sent", message_id = ?, created_at = NOW() WHERE id = ?`, [r.messageId, r.id]);
                try {
                    await query(
                        `INSERT INTO webhook_logs (user_id, recipient, message_id, status, event_type, type, raw_payload, created_at) 
                         VALUES (?, ?, ?, 'sent', 'SENT', ?, ?, NOW())`,
                        [r.user_id, r.mobile, r.messageId, (r.channel || 'rcs').toLowerCase(), JSON.stringify({ note: 'Initial status from queue' })]
                    );
                } catch (e) {}
            } else {
                await query(`UPDATE ${queueTable} SET status = "failed", error_message = ? WHERE id = ?`, [r.error, r.id]);
            }
        }

        // Logs
        const logs = results.map(r => [r.user_id, r.campaign_id, r.campaign_name, r.template_name, r.messageId || 'N/A', r.mobile, r.success ? 'sent' : 'failed', new Date(), r.channel || 'RCS']);
        if (logs.length > 0) await query(`INSERT INTO ${logsTable} (user_id, campaign_id, campaign_name, template_name, message_id, recipient, status, send_time, channel) VALUES ?`, [logs]);

        // Campaign totals
        for (const [campId, counts] of Object.entries(stats)) {
            await query(`UPDATE ${campaignTable} SET sent_count = COALESCE(sent_count, 0) + ?, failed_count = COALESCE(failed_count, 0) + ? WHERE id = ?`, [counts.sent, counts.failed, campId]);
            const [remains] = await query(`SELECT COUNT(*) as count FROM ${queueTable} WHERE campaign_id = ? AND status IN ("pending", "processing")`, [campId]);
            if (remains[0].count === 0) {
                const [checks] = await query(`SELECT recipient_count, sent_count, failed_count FROM ${campaignTable} WHERE id = ?`, [campId]);
                if (checks.length > 0 && (checks[0].recipient_count > 0 || (checks[0].sent_count + checks[0].failed_count) > 0)) {
                    await query(`UPDATE ${campaignTable} SET status = "sent" WHERE id = ?`, [campId]);
                }
            }
        }
    } catch (error) {
        console.error(`[${processorName}] Fatal Error:`, error);
    }
};

const processQueue = () => processBatch({
    campaignTable: 'campaigns',
    queueTable: 'campaign_queue',
    logsTable: 'message_logs',
    name: 'ManualWorker'
});

const processApiQueue = () => processBatch({
    campaignTable: 'api_campaigns',
    queueTable: 'api_campaign_queue',
    logsTable: 'api_message_logs',
    name: 'ApiWorker'
});

module.exports = { processQueue, processApiQueue, calculateNextRun };
