const { query } = require('../config/db');
const { sendRcsTemplate, sendRcsMessage, getRcsToken } = require('./rcsService');

// Normalize RCS result (helper)
const normalizeRcsResult = (result) => {
    if (!result) return { success: false, error: 'Empty provider response' };
    if (result.success === true) return { success: true, messageId: result.messageId || result.data || null };
    if (typeof result === 'object' && result.status && String(result.status).toUpperCase() === 'SUCCESS') {
        return { success: true, messageId: result.data || result.messageId || null };
    }
    return { success: false, error: result.error || JSON.stringify(result) };
};

const BATCH_SIZE = 1000; // Process 1000 messages at a time (MAX SPEED)

const processQueue = async () => {
    try {
        // 1. Fetch pending items
        // We join with campaigns to get template_id and status
        // Only process active campaigns
        const sql = `
            SELECT q.id, q.campaign_id, q.mobile, 
            COALESCE(mt.name, c.template_id) as template_name,
            c.name as campaign_name, c.channel
            FROM campaign_queue q
            JOIN campaigns c ON q.campaign_id = c.id
            LEFT JOIN message_templates mt ON c.template_id = mt.id
            WHERE q.status = 'pending' AND c.status = 'running'
            LIMIT ?
        `;

        const [items] = await query(sql, [BATCH_SIZE]);

        if (items.length === 0) return; // Nothing to do

        console.log(`[QueueProcessor] Processing ${items.length} items...`);

        // Get Token once for batch
        let rcsToken = null;
        try {
            rcsToken = await getRcsToken();
        } catch (e) {
            console.error('[QueueProcessor] Failed to get RCS token', e);
            // Retry later
            return;
        }


        // Track stats for bulk update
        const stats = {}; // { campaignId: { sent: 0, failed: 0 } }

        // Process in parallel
        const promises = items.map(async (item) => {
            if (!stats[item.campaign_id]) stats[item.campaign_id] = { sent: 0, failed: 0 };

            // Update status to processing
            await query('UPDATE campaign_queue SET status = "processing" WHERE id = ?', [item.id]);

            let result = { success: false, error: 'Unknown' };
            try {
                if (item.channel === 'RCS' || item.channel === 'rcs') {
                    // Try template first
                    try {
                        const raw = await sendRcsTemplate(item.mobile, item.template_name);
                        result = normalizeRcsResult(raw);
                    } catch (err) {
                        console.warn(`[QueueProcessor] Template failed for ${item.mobile}, trying text`);
                        const rawText = await sendRcsMessage(item.mobile, item.campaign_name);
                        result = normalizeRcsResult(rawText);
                    }
                } else {
                    result = { success: false, error: 'Channel not supported' };
                }

                if (result.success) {
                    await query(
                        'UPDATE campaign_queue SET status = "sent", message_id = ?, created_at = NOW() WHERE id = ?',
                        [result.messageId, item.id]
                    );

                    // Log to message_logs
                    await query(
                        'INSERT INTO message_logs (campaign_id, message_id, recipient, status, created_at) VALUES (?, ?, ?, ?, NOW())',
                        [item.campaign_id, result.messageId, item.mobile, 'sent']
                    );

                    stats[item.campaign_id].sent++;
                } else {
                    await query(
                        'UPDATE campaign_queue SET status = "failed", error_message = ? WHERE id = ?',
                        [result.error, item.id]
                    );
                    stats[item.campaign_id].failed++;
                }

            } catch (err) {
                console.error(`[QueueProcessor] Error processing item ${item.id}`, err);
                await query(
                    'UPDATE campaign_queue SET status = "failed", error_message = ? WHERE id = ?',
                    [err.message, item.id]
                );
                stats[item.campaign_id].failed++;
            }
        });


        // Safety timeout for the entire batch (15 seconds)
        const batchTimeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Batch processing timed out')), 15000)
        );

        await Promise.race([
            Promise.all(promises),
            batchTimeout
        ]).catch(err => console.error('[QueueProcessor] Batch Error/Timeout:', err));


        // Bulk update campaign stats
        for (const [campId, counts] of Object.entries(stats)) {
            if (counts.sent > 0 || counts.failed > 0) {
                await query(
                    'UPDATE campaigns SET sent_count = sent_count + ?, failed_count = failed_count + ? WHERE id = ?',
                    [counts.sent, counts.failed, campId]
                );
                console.log(`[Progress] Campaign ${campId}: +${counts.sent} sent, +${counts.failed} failed.`);
            }
        }

        console.log(`[QueueProcessor] Batch of ${items.length} completed.`);

    } catch (error) {
        console.error('[QueueProcessor] Fatal Error:', error);
    }
};

module.exports = { processQueue };
