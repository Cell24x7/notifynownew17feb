const { query } = require('../config/db');
const { sendRcsTemplate, sendRcsMessage, getRcsToken } = require('./rcsService');

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
            COALESCE(c.template_name, mt.name, c.template_id) as template_name,
            c.name as campaign_name, c.channel, c.user_id, c.credits_deducted,
            u.rcs_config_id,
            rc.name as rcs_config_name, rc.auth_url, rc.api_base_url, 
            rc.client_id, rc.client_secret, rc.bot_id
            FROM campaign_queue q
            JOIN campaigns c ON q.campaign_id = c.id
            JOIN users u ON c.user_id = u.id
            LEFT JOIN rcs_configs rc ON u.rcs_config_id = rc.id
            LEFT JOIN message_templates mt ON c.template_id = mt.id
            WHERE q.status = 'pending' AND c.status = 'running'
            LIMIT ?
        `;

        const [items] = await query(sql, [BATCH_SIZE]);

        if (items.length === 0) return; // Nothing to do

        // Safety Deduct Campaign Credits
        const uniqueCampaigns = [...new Set(items.filter(i => !i.credits_deducted).map(i => i.campaign_id))];
        for (const campId of uniqueCampaigns) {
            const deductionResult = await deductCampaignCredits(campId);
            if (!deductionResult.success) {
                console.error(`[QueueProcessor] Credit deduction failed for ${campId}: ${deductionResult.message}. Pausing campaign.`);
                await query('UPDATE campaigns SET status = "failed" WHERE id = ?', [campId]);
                // We'll skip this campaign's items in this run
                continue;
            }
        }

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
                        const raw = await sendRcsTemplate(item.mobile, item.template_name, userConfig);
                        result = normalizeRcsResult(raw);
                    } catch (err) {
                        console.warn(`[QueueProcessor] Template failed for ${item.mobile}, trying text`);
                        const rawText = await sendRcsMessage(item.mobile, item.campaign_name, userConfig);
                        result = normalizeRcsResult(rawText);
                    }
                } else {
                    result = { success: false, error: 'Channel not supported' };
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

        // Bulk Insert into message_logs (True Optimization)
        const logs = results.filter(r => r.success).map(r => [
            r.user_id, r.campaign_id, r.campaign_name, r.template_name, r.messageId, r.mobile, 'sent', new Date()
        ]);

        if (logs.length > 0) {
            try {
                await query(
                    'INSERT INTO message_logs (user_id, campaign_id, campaign_name, template_name, message_id, recipient, status, send_time) VALUES ?',
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
