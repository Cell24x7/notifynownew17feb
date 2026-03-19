const { query } = require('../config/db');
const { sendRcsTemplate, sendRcsMessage, getRcsToken } = require('./rcsService');
const { sendSMS } = require('../utils/smsService');
const axios = require('axios');

const PINBOT_BASE = 'https://partnersv1.pinbot.ai/v3';
const GRAPH_BASE = 'https://graph.facebook.com/v19.0';

// Normalize RCS result (helper) for Dotgo
const normalizeRcsResult = (result) => {
    if (!result) return { success: false, error: 'Empty provider response' };

    // Dotgo success response usually has messageId
    if (result.messageId) {
        return { success: true, messageId: result.messageId };
    }

    // Fallback for success flags
    if (result.success === true || result.status === 'SUCCESS') {
        return { success: true, messageId: result.messageId || result.data || null };
    }

    return { success: false, error: result.error || result.description || JSON.stringify(result) };
};

const BATCH_SIZE = 500; // Increased for maximum throughput

const { deductCampaignCredits } = require('./walletService');

const replaceVariables = (text, variablesJson) => {
    if (!text || !variablesJson) return text;
    try {
        const vars = typeof variablesJson === 'string' ? JSON.parse(variablesJson) : variablesJson;
        let result = text;

        Object.keys(vars).forEach(key => {
            const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            // Support both {{var}} and {{ var }} as well as [var] and [ var ]
            const regex = new RegExp(`\\[\\s*${escapedKey}\\s*\\]|\\{\\{\\s*${escapedKey}\\s*\\}\\}`, 'gi');
            result = result.replace(regex, vars[key]);
        });

        return result;
    } catch (err) {
        return text;
    }
};

const getOrderedVariables = (text, variablesJson) => {
    if (!text || !variablesJson) return [];
    try {
        const vars = typeof variablesJson === 'string' ? JSON.parse(variablesJson) : variablesJson;
        // Regex to match {{var}} or [var] with optional internal whitespace
        const regex = /\{\{\s*([^}\s]+)\s*\}\}|\[\s*([^\]\s]+)\s*\]/g;
        const results = [];
        let match;
        while ((match = regex.exec(text)) !== null) {
            const varName = (match[1] || match[2]).trim();
            results.push(String(vars[varName] || ''));
        }
        return results;
    } catch (err) {
        return [];
    }
};

const resolveMappedVariables = (mappingJson, variablesJson) => {
    if (!mappingJson) return variablesJson;
    try {
        const mapping = typeof mappingJson === 'string' ? JSON.parse(mappingJson) : mappingJson;
        const vars = typeof variablesJson === 'string' ? JSON.parse(variablesJson) : variablesJson;
        if (!mapping || Object.keys(mapping).length === 0) return vars;

        const resolved = {};
        Object.keys(mapping).forEach(key => {
            const m = mapping[key];
            if (m.type === 'field') {
                resolved[key] = vars[m.value] || '';
            } else if (m.type === 'custom') {
                resolved[key] = m.value || '';
            }
        });
        return { ...vars, ...resolved };
    } catch (e) {
        return variablesJson;
    }
};

const processQueue = async () => {
    try {
        // Auto-start scheduled campaigns whose time has passed
        await query(`
            UPDATE campaigns 
            SET status = 'running' 
            WHERE status = 'scheduled' 
            AND scheduled_at <= NOW()
        `);

        // 1. Fetch pending items
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
            FROM campaign_queue q
            JOIN campaigns c ON q.campaign_id = c.id
            JOIN users u ON c.user_id = u.id
            LEFT JOIN rcs_configs rc ON u.rcs_config_id = rc.id
            LEFT JOIN whatsapp_configs wc ON u.whatsapp_config_id = wc.id
            LEFT JOIN message_templates mt ON (c.template_id = mt.id OR (c.template_id = mt.name AND c.user_id = mt.user_id))
            WHERE q.status = 'pending' AND c.status = 'running'
            LIMIT ?
        `;

        let [items] = await query(sql, [BATCH_SIZE]);

        if (items.length === 0) return; // Nothing to do

        // Safety Deduct Campaign Credits
        const uniqueCampaigns = [...new Set(items.filter(i => !i.credits_deducted).map(i => i.campaign_id))];
        const failedCampaigns = new Set();

        for (const campId of uniqueCampaigns) {
            const deductionResult = await deductCampaignCredits(campId);
            if (!deductionResult.success) {
                console.error(`[QueueProcessor] Credit deduction failed for ${campId}: ${deductionResult.message}. Pausing campaign.`);
                await query('UPDATE campaigns SET status = "paused" WHERE id = ?', [campId]);
                failedCampaigns.add(campId);
                continue;
            }
        }

        // LEAK FIX: Filter out items that belong to campaigns that failed credit deduction
        if (failedCampaigns.size > 0) {
            items = items.filter(i => !failedCampaigns.has(i.campaign_id));
        }

        if (items.length === 0) return; 

        const itemIds = items.map(i => i.id);

        // 2. Batch Update to 'processing' (Optimization: One query instead of N)
        await query('UPDATE campaign_queue SET status = "processing" WHERE id IN (?)', [itemIds]);

        console.log(`[QueueProcessor] Processing ${items.length} items in parallel...`);

        const stats = {}; // { campaignId: { sent: 0, failed: 0 } }
        const results = []; // Collect results for bulk update

        // 3. Process in parallel (API Calls)
        const promises = items.map(async (item) => {
            if (!stats[item.campaign_id]) stats[item.campaign_id] = { sent: 0, failed: 0 };

            let result = { success: false, error: 'Unknown' };
            try {
                // Apply variable mapping!
                const resolvedVars = resolveMappedVariables(item.variable_mapping, item.variables);

                if (item.channel === 'RCS' || item.channel === 'rcs') {
                    const userConfig = item.rcs_config_id ? {
                        id: item.rcs_config_id,
                        name: item.rcs_config_name,
                        auth_url: item.auth_url,
                        api_base_url: item.api_base_url,
                        client_id: item.client_id,
                        client_secret: item.client_secret,
                        bot_id: item.bot_id
                    } : null;

                    try {
                        const body = item.template_body || '';
                        const meta = typeof item.template_metadata === 'string' ? item.template_metadata : JSON.stringify(item.template_metadata || {});
                        const searchContext = `${body} ${meta}`;

                        // We always try to use the template engine if we have a template name/code
                        if (item.template_name && item.template_name.length > 5) {
                            // Extract ordered variables for Dotgo customParams scanning BOTH body and meta
                            const customParams = getOrderedVariables(searchContext, resolvedVars);

                            console.log(`[QueueProcessor] Sending RCS Template [${item.template_name}] to ${item.mobile} with params:`, customParams);
                            const raw = await sendRcsTemplate(item.mobile, item.template_name, userConfig, customParams);
                            result = normalizeRcsResult(raw);
                        } else {
                            // Text fallback for non-template scenarios
                            const customMessage = replaceVariables(body || item.campaign_name, resolvedVars);
                            const rawText = await sendRcsMessage(item.mobile, customMessage, userConfig);
                            result = normalizeRcsResult(rawText);
                        }
                    } catch (err) {
                        console.warn(`[QueueProcessor] RCS Process Error for ${item.mobile}:`, err.message);
                        const customBody = replaceVariables(item.template_body || item.campaign_name, resolvedVars);
                        const rawText = await sendRcsMessage(item.mobile, customBody, userConfig);
                        result = normalizeRcsResult(rawText);
                    }
                } else if (item.channel === 'whatsapp' || item.channel === 'WhatsApp') {
                    // ──── WHATSAPP CHANNEL ────
                    try {
                        if (!item.whatsapp_config_id) {
                            result = { success: false, error: 'No WhatsApp configuration assigned to user' };
                        } else {
                            const isPinbot = item.wa_provider === 'vendor2';
                            let msgUrl, headers;

                            if (isPinbot) {
                                msgUrl = `${PINBOT_BASE}/${item.wa_ph_no_id}/messages`;
                                headers = { apikey: item.wa_api_key, 'Content-Type': 'application/json' };
                            } else {
                                msgUrl = `${GRAPH_BASE}/${item.wa_ph_no_id}/messages`;
                                headers = { Authorization: `Bearer ${item.wa_token}`, 'Content-Type': 'application/json' };
                            }

                            // Build WhatsApp message payload
                            let mobile = item.mobile.replace(/\D/g, '');
                            // Ensure country code
                            if (mobile.length === 10) mobile = '91' + mobile;

                            let langCode = 'en_US';
                            try {
                                const metaStr = item.template_metadata;
                                const meta = typeof metaStr === 'string' ? JSON.parse(metaStr) : (metaStr || {});
                                if (meta.language) langCode = meta.language;
                            } catch(e) {}

                            const payload = {
                                messaging_product: 'whatsapp',
                                recipient_type: 'individual',
                                to: mobile,
                                type: 'template',
                                template: {
                                    name: item.template_name,
                                    language: { code: langCode }
                                }
                            };

                            const payloadComponents = [];
                            const metaStr = item.template_metadata;
                            const meta = typeof metaStr === 'string' ? JSON.parse(metaStr) : (metaStr || {});
                            const mtComponents = meta.components || [];

                            // Construct and scan only the BODY component for body variables to avoid duplication
                            const bodyComp = mtComponents.find(c => c.type === 'BODY' || c.type === 'body');
                            const bodyText = bodyComp?.text || item.template_body || '';
                            const waParams = getOrderedVariables(bodyText, resolvedVars);
                            
                            // 3. Construct specific components for WhatsApp API
                            // a) Header (Media or Text)
                            const headerComp = mtComponents.find(c => c.type === 'HEADER' || c.type === 'header');
                            if (headerComp) {
                                if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerComp.format?.toUpperCase())) {
                                    const mediaType = headerComp.format.toLowerCase();
                                    const mediaHandleOrUrl = headerComp.example?.header_handle?.[0] || '';
                                    let dynamicHeader = String(resolvedVars['header_url'] || mediaHandleOrUrl || '');

                                    if (dynamicHeader.startsWith('4::') && headerComp.file_url) {
                                        dynamicHeader = headerComp.file_url;
                                    }

                                    if (dynamicHeader) {
                                        const isUrl = dynamicHeader.startsWith('http');
                                        payloadComponents.push({
                                            type: 'header',
                                            parameters: [{
                                                type: mediaType,
                                                [mediaType]: isUrl ? { link: dynamicHeader } : { id: dynamicHeader }
                                            }]
                                        });
                                    }
                                } else if (headerComp.format?.toUpperCase() === 'TEXT' && headerComp.text?.includes('{{')) {
                                    // Handle Text Header Variables
                                    const headParams = getOrderedVariables(headerComp.text, resolvedVars);
                                    if (headParams.length > 0) {
                                        payloadComponents.push({
                                            type: 'header',
                                            parameters: headParams.map(v => ({ type: 'text', text: String(v) }))
                                        });
                                    }
                                }
                            }

                            // b) Body Parameters
                            if (waParams.length > 0) {
                                payloadComponents.push({
                                    type: 'body',
                                    parameters: waParams.map(v => ({ type: 'text', text: String(v) }))
                                });
                            }

                            // c) Button Parameters
                            const buttonComp = mtComponents.find(c => c.type === 'BUTTONS' || c.type === 'buttons');
                            if (buttonComp && buttonComp.buttons) {
                                buttonComp.buttons.forEach((btn, idx) => {
                                    // Map dynamic URL buttons to payload parameters
                                    if (btn.type === 'URL' && btn.url) {
                                        const btnKey = `button_${idx + 1}_url`;
                                        const btnValue = resolvedVars[btnKey];
                                        
                                        if (btnValue) {
                                            payloadComponents.push({
                                                type: 'button',
                                                sub_type: 'url',
                                                index: String(idx),
                                                parameters: [{ type: 'text', text: String(btnValue) }]
                                            });
                                        } else if (btn.url.includes('{{') || btn.url.includes('[')) {
                                            const btnParams = getOrderedVariables(btn.url, resolvedVars);
                                            if (btnParams.length > 0) {
                                                payloadComponents.push({
                                                    type: 'button',
                                                    sub_type: 'url',
                                                    index: String(idx),
                                                    parameters: btnParams.map(v => ({ type: 'text', text: String(v) }))
                                                });
                                            }
                                        }
                                    }
                                });
                            }

                            if (payloadComponents.length > 0) {
                                payload.template.components = payloadComponents;
                            }
                            
                            console.log(`[QueueProcessor] Full WhatsApp Payload for ${mobile}:`, JSON.stringify(payload, null, 2));

                            const response = await axios.post(msgUrl, payload, { headers });
                            const respData = response.data;

                            if (respData.messages && respData.messages.length > 0) {
                                result = { success: true, messageId: respData.messages[0].id };
                            } else if (respData.message_id) {
                                result = { success: true, messageId: respData.message_id };
                            } else {
                                result = { success: true, messageId: `wa_${Date.now()}_${mobile}` };
                            }

                            console.log(`✅ WhatsApp sent to ${mobile} via ${isPinbot ? 'Pinbot' : 'Graph'} [${result.messageId}]`);
                        }
                    } catch (waErr) {
                        const errMsg = waErr.response?.data?.error?.message || waErr.response?.data?.message || waErr.message;
                        console.error(`❌ WhatsApp send failed for ${item.mobile}:`, errMsg);
                        result = { success: false, error: errMsg };
                    }
                } else if (item.channel === 'sms' || item.channel === 'SMS') {
                    // ──── SMS CHANNEL ────
                    try {
                        const body = item.template_body || item.campaign_name;
                        const customMessage = replaceVariables(body, resolvedVars);

                        // Extract DLT Template ID and PE ID from metadata if available
                        let templateId = item.raw_template_id || '', peId = '', hashId = '';
                        try {
                            const meta = typeof item.template_metadata === 'string' ? JSON.parse(item.template_metadata) : (item.template_metadata || {});
                            templateId = meta.templateId || meta.dlt_template_id || templateId;
                            peId = meta.peId || meta.pe_id || '';
                            hashId = meta.hashId || meta.hash_id || '';
                        } catch(e) {}

                        const raw = await sendSMS(item.mobile, customMessage, {
                            userId: item.user_id,
                            templateId,
                            peId,
                            hashId
                        });
                        
                        // Treat it as success if it didn't throw
                        // Gateway usually returns a job ID or status, but we'll generate a internal trackable ID if needed
                        result = { success: true, messageId: `sms_${Date.now()}_${item.mobile.substring(item.mobile.length - 4)}` };
                        console.log(`✅ SMS sent to ${item.mobile} via Gateway`);
                    } catch (smsErr) {
                        console.error(`❌ SMS send failed for ${item.mobile}:`, smsErr.message);
                        result = { success: false, error: smsErr.message };
                    }
                } else {
                    result = { success: false, error: `Channel '${item.channel}' not supported` };
                }

                results.push({
                    id: item.id,
                    user_id: item.user_id,
                    campaign_id: item.campaign_id,
                    campaign_name: item.campaign_name,
                    template_name: item.template_name,
                    mobile: item.mobile,
                    success: result.success,
                    messageId: result.messageId,
                    error: result.error
                });

                if (result.success) {
                    stats[item.campaign_id].sent++;
                } else {
                    stats[item.campaign_id].failed++;
                }

            } catch (err) {
                console.error(`[QueueProcessor] Error processing item ${item.id}`, err);
                results.push({
                    id: item.id,
                    user_id: item.user_id,
                    campaign_id: item.campaign_id,
                    campaign_name: item.campaign_name,
                    template_name: item.template_name,
                    mobile: item.mobile,
                    success: false,
                    error: err.message
                });
                stats[item.campaign_id].failed++;
            }
        });

        // Safety timeout for the entire batch (3 minutes for 200 items)
        const batchTimeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Batch processing timed out')), 180000)
        );

        await Promise.race([
            Promise.all(promises),
            batchTimeout
        ]).catch(err => console.error('[QueueProcessor] Batch Error/Timeout:', err));

        // 4. Final Bulk Updates (Optimization: Minimize DB roundtrips)

        // Update campaign_queue in bulk (Success)
        const sentIds = results.filter(r => r.success).map(r => r.id);
        if (sentIds.length > 0) {
            // Note: We can't easily bulk update different message_ids in one standard MySQL query without CASE, 
            // but we can update status. message_id is optional or we can do it per-row if needed.
            // For now, let's update status in bulk, and message_ids individually or just skip if not critical.
            // Actually, message_id is important. We'll do individual updates for the final status 
            // but maybe wrap them? No, let's use the individual updates but the processing update was the big win.

            // Reverting to individual for final status to keep message_id mapping, 
            // but the 'processing' update was already batched.
            for (const r of results.filter(r => r.success)) {
                await query('UPDATE campaign_queue SET status = "sent", message_id = ?, created_at = NOW() WHERE id = ?', [r.messageId, r.id]);

                // NEW: Immediate log in webhook_logs for real-time visualization
                try {
                    await query(
                        `INSERT INTO webhook_logs 
                        (user_id, recipient, message_id, status, event_type, raw_payload, created_at) 
                        VALUES (?, ?, ?, ?, ?, ?, NOW())`,
                        [r.user_id, r.mobile, r.messageId, 'sent', 'SENT', JSON.stringify({ note: 'Initial status from queue' })]
                    );
                } catch (logErr) {
                    console.error('[QueueProcessor] Failed to create initial webhook_log:', logErr.message);
                }
            }
        }

        // Update campaign_queue in bulk (Failure)
        const failedItems = results.filter(r => !r.success);
        for (const r of failedItems) {
            await query('UPDATE campaign_queue SET status = "failed", error_message = ? WHERE id = ?', [r.error, r.id]);
        }

        // Bulk Insert into message_logs (Include all results for details page visibility)
        const logs = results.map(r => [
            r.user_id, r.campaign_id, r.campaign_name, r.template_name, r.messageId || 'N/A', r.mobile, r.success ? 'sent' : 'failed', new Date(), r.channel || 'RCS'
        ]);

        if (logs.length > 0) {
            try {
                await query(
                    'INSERT INTO message_logs (user_id, campaign_id, campaign_name, template_name, message_id, recipient, status, send_time, channel) VALUES ?',
                    [logs]
                );
            } catch (logErr) {
                console.error('[QueueProcessor] Bulk message_logs failed', logErr.message);
            }
        }

        // Update Campaign Totals
        for (const [campId, counts] of Object.entries(stats)) {
            if (counts.sent > 0 || counts.failed > 0) {
                await query(
                    'UPDATE campaigns SET sent_count = COALESCE(sent_count, 0) + ?, failed_count = COALESCE(failed_count, 0) + ? WHERE id = ?',
                    [counts.sent, counts.failed, campId]
                );

                // Check if campaign is finished
                const [remains] = await query(
                    'SELECT COUNT(*) as count FROM campaign_queue WHERE campaign_id = ? AND status IN ("pending", "processing")',
                    [campId]
                );

                if (remains[0].count === 0) {
                    // Safety: Double check if we actually processed anything or if it's just an empty campaign
                    const [checks] = await query('SELECT recipient_count, sent_count, failed_count FROM campaigns WHERE id = ?', [campId]);
                    if (checks.length > 0 && (checks[0].recipient_count > 0 || (checks[0].sent_count + checks[0].failed_count) > 0)) {
                        await query('UPDATE campaigns SET status = "sent" WHERE id = ?', [campId]);
                        console.log(`✅ Campaign ${campId} marked as SENT (Finished)`);
                    } else if (checks.length > 0 && checks[0].recipient_count === 0) {
                        console.log(`[QueueProcessor] Campaign ${campId} has 0 recipients, skipping auto-finish.`);
                    }
                }
            }
        }

        console.log(`[QueueProcessor] Batch of ${items.length} completed.`);

    } catch (error) {
        console.error('[QueueProcessor] Fatal Error:', error);
    }
};


module.exports = { processQueue };
