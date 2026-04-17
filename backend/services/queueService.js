const axios = require('axios');
const { query } = require('../config/db');
const { deductCampaignCredits } = require('./walletService');
const { sendRcsTemplate, sendRcsMessage } = require('./rcsService');
const { sendSMS } = require('../utils/smsService');

const BATCH_SIZE = 10000;

/**
 * Normalizes RCS results from service
 */
const normalizeRcsResult = (raw) => {
    if (raw && (raw.id || raw.messageId || raw.message_id || raw.success)) {
        return { success: true, messageId: raw.id || raw.messageId || raw.message_id || `rcs_${Date.now()}` };
    }
    return { success: false, error: raw?.error || 'Provider Error' };
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
 * Maps variable_mapping JSON
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
 * Scans text for {{1}}, {{2}}...
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

const calculateNextRun = (currentRun, frequency, repeatDays) => {
    if (!currentRun) return null;
    const next = new Date(currentRun);
    if (frequency === 'daily') {
        next.setDate(next.getDate() + 1);
    } else if (frequency === 'weekly') {
        if (!repeatDays || !Array.isArray(repeatDays) || repeatDays.length === 0) {
            next.setDate(next.getDate() + 7);
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
 * Core processor: Drains SQL Queue into BullMQ (Optimized for 1Cr+ volume)
 */
const processBatch = async ({ campaignTable, queueTable, logsTable, name: processorName }) => {
    let redisClient = null;
    try {
        const tableConfig = { campaignTable, queueTable, logsTable };
        const workerId = `worker_${process.env.APP_NAME || 'notifynow'}_${process.pid}_${Date.now()}`;
        const DRIP_BATCH_SIZE = 10000;
        const envSuffix = (process.env.APP_NAME || 'notifynow').replace(/-developer|-production/g, '');

        // 0. Persistent Redis for this loop
        const { redisConnection, campaignQueue } = require('../queues/campaignQueue');
        const Redis = require('ioredis');
        const { sendUniversalMessage } = require('./sendingService');
        
        let useRedis = true;
        try {
            redisClient = new Redis({
                ...redisConnection,
                retryStrategy: () => null, // Don't retry inside this loop if it fails
                maxRetriesPerRequest: 0
            });
            
            // Fast ping check
            await Promise.race([
                redisClient.ping(),
                new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 500))
            ]);
        } catch (redisErr) {
            // console.log('⚠️ [Worker] Redis unavailable, using DIRECT SQL processing.');
            useRedis = false;
            if (redisClient) {
                redisClient.disconnect();
                redisClient = null;
            }
        }

        // --- 1. Auto-start scheduled campaigns ---
        await query(`
            UPDATE ${campaignTable} 
            SET status = 'running', last_run_at = NOW()
            WHERE status IN ('scheduled', 'draft') 
            AND next_run_at <= NOW()
            AND status != 'running'
        `).catch(() => {});

        // --- 2. SQL FETCH JOINED DATA (Restored to Original for Safety) ---
        const sql = `
             SELECT q.id, q.campaign_id, q.mobile, q.variables as contact_variables,
             c.user_id, c.channel, c.name as campaign_name,
             COALESCE(mt.name, c.template_name) as template_name,
             COALESCE(mt.body, c.template_body) as template_body,
             COALESCE(mt.metadata, c.template_metadata) as template_metadata,
             COALESCE(mt.pe_id, c.pe_id, u.pe_id) as pe_id,
             COALESCE(mt.hash_id, c.hash_id, u.hash_id) as hash_id,
             COALESCE(mt.sender, c.sender) as sender,
             COALESCE(mt.template_id, c.template_id) as template_id,
             c.variable_mapping, c.is_failover_enabled, c.failover_sms_template, u.sms_gateway_id,
             rc.auth_url, rc.api_base_url, rc.client_id, rc.client_secret, rc.bot_id,
             wc.provider as wa_provider, wc.api_key as wa_api_key, wc.wa_token, wc.ph_no_id as wa_ph_no_id, wc.wa_biz_accnt_id as wa_biz_accnt_id,
             COALESCE(c.ai_voice_config_id, u.ai_voice_config_id) as voice_config_id,
             v.api_user, v.api_password
             FROM ${queueTable} q
             JOIN ${campaignTable} c ON q.campaign_id = c.id
             JOIN users u ON c.user_id = u.id
             LEFT JOIN rcs_configs rc ON IFNULL(c.rcs_config_id, u.rcs_config_id) = rc.id
             LEFT JOIN whatsapp_configs wc ON IFNULL(c.whatsapp_config_id, u.whatsapp_config_id) = wc.id
             LEFT JOIN voice_configs v ON IFNULL(c.ai_voice_config_id, u.ai_voice_config_id) = v.id
             LEFT JOIN message_templates mt ON (c.template_id = mt.id OR (c.template_id = mt.name AND c.user_id = mt.user_id))
             WHERE q.status = 'pending' AND c.status = 'running'
             LIMIT ?
        `;

        let totalProcessed = 0;
        while (true) {
            const [candidates] = await query(sql, [DRIP_BATCH_SIZE]);
            if (candidates && candidates.length > 0) {
                console.log(`[Worker:${processorName}] Found ${candidates.length} candidates in ${queueTable}`);
            }
            
            if (!candidates || candidates.length === 0) break;

            const candidateIds = candidates.map(c => c.id);
            
            // 3. Atomically CLAIM the candidates
            const [markResult] = await query(
                `UPDATE ${queueTable} SET status = ?, worker_id = ?, updated_at = NOW() WHERE id IN (?) AND status = 'pending'`, 
                ['processing', workerId, candidateIds]
            );
            if (markResult.affectedRows === 0) break;

            // 4. Credits check (Only check per unique campaign)
            const uniqueCampaigns = [...new Set(candidates.filter(i => !i.credits_deducted).map(i => i.campaign_id))];
            const failedCampaigns = new Set();
            for (const campId of uniqueCampaigns) {
                const creditResult = await deductCampaignCredits(campId, campaignTable);
                if (!creditResult.success) {
                    await query(`UPDATE ${campaignTable} SET status = "paused" WHERE id = ?`, [campId]);
                    failedCampaigns.add(campId);
                }
            }

            // Filter out items in failed campaigns
            const validItems = failedCampaigns.size > 0 ? candidates.filter(i => !failedCampaigns.has(i.campaign_id)) : candidates;
            if (validItems.length === 0) break;

            if (useRedis) {
                // 5. Update Redis progress counters (Faster in pipeline)
                const pipeline = redisClient.pipeline();
                const countsByCamp = {};
                validItems.forEach(item => countsByCamp[item.campaign_id] = (countsByCamp[item.campaign_id] || 0) + 1);
                Object.keys(countsByCamp).forEach(cid => pipeline.incrby(`${envSuffix}:camp_progress:${cid}`, countsByCamp[cid]));
                await pipeline.exec();

                // 6. BullMQ Offloading
                const jobs = validItems.map(item => ({
                    name: `sending-${item.mobile}`,
                    data: { item: item, tableConfig },
                    opts: { jobId: `${queueTable}-${item.id}`, removeOnComplete: true } 
                }));
                await campaignQueue.addBulk(jobs);
                totalProcessed += validItems.length;
            } else {
                // 🏎️ DIRECT PROCESSING (NO REDIS MODE - FOR LOCAL WINDOWS)
                for (const item of validItems) {
                    const sendPayload = { ...item, variables: item.contact_variables };
                    const sendRes = await sendUniversalMessage(sendPayload);
                    
                    // Log immediately to SQL (Slow, but fine for local small batches)
                    await query(`
                        INSERT INTO ${logsTable} (user_id, campaign_id, campaign_name, template_name, recipient, channel, message_id, status, error, send_time, is_failover_enabled, failover_sms_template)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?)
                    `, [
                        item.user_id, 
                        item.campaign_id, 
                        item.campaign_name, 
                        item.template_name, 
                        item.mobile, 
                        item.channel, 
                        sendRes.messageId || null, 
                        sendRes.success ? 'sent' : 'failed', 
                        sendRes.error || null,
                        item.is_failover_enabled || 0,
                        item.failover_sms_template || null
                    ]);

                    await query(`UPDATE ${queueTable} SET status = ?, processed_at = NOW() WHERE id = ?`, 
                        [sendRes.success ? 'sent' : 'failed', item.id]);
                }
                totalProcessed += validItems.length;
            }

            if (candidates.length < DRIP_BATCH_SIZE) break;
            await new Promise(resolve => setTimeout(resolve, 50));
        }

        // if (totalProcessed > 0) console.log(`[${processorName}] Processed ${totalProcessed} items ${useRedis ? '(via BullMQ)' : '(DIRECT)'}.`);
    } catch (error) {
        console.error(`[${processorName}] Ingestion Error:`, error.message);
    } finally {
        if (redisClient) await redisClient.quit().catch(() => {});
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

module.exports = { 
    processQueue, 
    processApiQueue, 
    calculateNextRun, 
    resolveMappedVariables, 
    getOrderedVariables,
    replaceVariables,
    normalizeRcsResult
};
