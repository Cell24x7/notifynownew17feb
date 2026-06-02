/**
 * waUnofficialPollingService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Background polling service for Unofficial WhatsApp (Baileys) delivery status.
 *
 * Problem: The Baileys server at wa.notifynow.in sends messages asynchronously.
 * After a campaign fires, delivery/read statuses update on the Baileys side but
 * our api_message_logs table never gets updated (rows stay stuck at "sent").
 *
 * Solution: Every 30 seconds, find all active campaigns (channel=WhatsApp_Unofficial,
 * status=sent, last 24h) and sync their delivery status from Baileys into our DB.
 *
 * Two strategies (tried in order):
 *   1. Per-recipient logs via /api/campaign/:id/logs or /contacts  (most accurate)
 *   2. Aggregate counts from /api/campaign/:id/status              (fallback)
 * ─────────────────────────────────────────────────────────────────────────────
 */

const axios = require('axios');
const { query } = require('../config/db');

const EXTERNAL_BASE_URL = 'https://wa.notifynow.in';
const POLL_INTERVAL_MS  = 30 * 1000;   // 30 seconds
const ACTIVE_WINDOW_HRS = 24;           // Only poll campaigns from last 24 hours
const MAX_CAMPAIGNS_PER_RUN = 20;       // Cap to avoid DB overload

let isPolling = false;

// ─────────────────────────────────────────────────────────────────────────────
// Fetch per-recipient status from Baileys
// Returns: Array<{ phone, status }> or null if not available
// ─────────────────────────────────────────────────────────────────────────────
async function fetchBaileysRecipientStatus(campaignId) {
    // Strategy A: Try /logs endpoint (most specific)
    try {
        const res = await axios.get(
            `${EXTERNAL_BASE_URL}/api/campaign/${campaignId}/logs`,
            { timeout: 8000 }
        );
        const data = res.data;
        const logs = data?.logs || data?.data || (Array.isArray(data) ? data : null);
        if (Array.isArray(logs) && logs.length > 0 && (logs[0].status || logs[0].queue_status)) {
            return logs.map(l => ({
                phone: String(l.phone_number || l.phone || l.mobile || l.number || l.recipient || '').replace(/\D/g, ''),
                status: (l.status || l.queue_status || 'sent').toLowerCase()
            })).filter(l => l.phone.length >= 10);
        }
    } catch (e) { /* endpoint may not exist */ }

    // Strategy B: Try /contacts endpoint
    try {
        const res = await axios.get(
            `${EXTERNAL_BASE_URL}/api/campaign/${campaignId}/contacts`,
            { timeout: 8000 }
        );
        const data = res.data;
        const contacts = data?.contacts || data?.data || (Array.isArray(data) ? data : null);
        if (Array.isArray(contacts) && contacts.length > 0 && (contacts[0].status || contacts[0].queue_status)) {
            const actionable = contacts
                .filter(c => ['delivered', 'read', 'failed'].includes((c.status || c.queue_status || '').toLowerCase()))
                .map(c => ({
                    phone: String(c.phone_number || c.phone || c.mobile || c.number || '').replace(/\D/g, ''),
                    status: (c.status || c.queue_status).toLowerCase()
                }))
                .filter(c => c.phone.length >= 10);
            if (actionable.length > 0) return actionable;
        }
    } catch (e) { /* endpoint may not exist */ }

    return null; // No per-recipient data available
}

// ─────────────────────────────────────────────────────────────────────────────
// Sync a single campaign
// ─────────────────────────────────────────────────────────────────────────────
async function syncCampaign(campaignId) {
    try {
        // ── 1. Fetch aggregate status from Baileys ──────────────────────────
        const statusRes = await axios.get(
            `${EXTERNAL_BASE_URL}/api/campaign/${campaignId}/status`,
            { timeout: 8000 }
        );
        const remoteData = statusRes.data?.data || statusRes.data;
        if (!remoteData) return;

        const breakdown       = remoteData.message_breakdown || {};
        const remoteDelivered = (breakdown.delivered || 0);
        const remoteRead      = (breakdown.read      || 0);
        const remoteFailed    = (breakdown.failed    || 0);

        // If everything is still pending/sent, nothing to update yet
        if (remoteDelivered === 0 && remoteRead === 0 && remoteFailed === 0) return;

        // ── 2. Try per-recipient sync ───────────────────────────────────────
        const recipientList = await fetchBaileysRecipientStatus(campaignId);

        if (recipientList && recipientList.length > 0) {
            let updated = 0;
            for (const { phone, status } of recipientList) {
                if (!['delivered', 'read', 'failed'].includes(status)) continue;

                const last10 = phone.slice(-10);
                const [rows] = await query(
                    `SELECT id, status FROM api_message_logs
                     WHERE campaign_id = ? AND (recipient LIKE ? OR recipient = ?)
                     LIMIT 1`,
                    [campaignId, `%${last10}`, phone]
                );
                if (rows.length === 0) continue;

                const row = rows[0];
                const weights = { sent: 1, delivered: 2, read: 3, failed: 99 };
                const oldStatus = (row.status || 'sent').toLowerCase();
                if ((weights[status] || 0) <= (weights[oldStatus] || 0)) continue;

                if (status === 'delivered') {
                    await query(
                        `UPDATE api_message_logs
                         SET status = 'delivered',
                             delivery_time = COALESCE(delivery_time, NOW()),
                             updated_at = NOW()
                         WHERE id = ?`,
                        [row.id]
                    );
                    if (oldStatus !== 'delivered' && oldStatus !== 'read') {
                        await query(`UPDATE api_campaigns SET delivered_count = delivered_count + 1 WHERE id = ?`, [campaignId]);
                    }
                } else if (status === 'read') {
                    await query(
                        `UPDATE api_message_logs
                         SET status = 'read',
                             delivery_time = COALESCE(delivery_time, NOW()),
                             read_time = COALESCE(read_time, NOW()),
                             updated_at = NOW()
                         WHERE id = ?`,
                        [row.id]
                    );
                    if (oldStatus !== 'read') {
                        if (oldStatus !== 'delivered') {
                            await query(`UPDATE api_campaigns SET delivered_count = delivered_count + 1, read_count = read_count + 1 WHERE id = ?`, [campaignId]);
                        } else {
                            await query(`UPDATE api_campaigns SET read_count = read_count + 1 WHERE id = ?`, [campaignId]);
                        }
                    }
                } else if (status === 'failed') {
                    await query(
                        `UPDATE api_message_logs
                         SET status = 'failed',
                             failure_reason = 'Message failed on gateway',
                             updated_at = NOW()
                         WHERE id = ?`,
                        [row.id]
                    );
                    if (oldStatus !== 'failed') {
                        await query(`UPDATE api_campaigns SET failed_count = failed_count + 1 WHERE id = ?`, [campaignId]);
                    }
                }
                updated++;
            }
            if (updated > 0) {
                console.log(`[WA-POLL] Campaign ${campaignId}: per-recipient sync → ${updated} rows updated`);
            }
            return;
        }

        // ── 3. Fallback: aggregate-based sync ──────────────────────────────
        // Get all rows for this campaign ordered oldest-first
        const [allRows] = await query(
            `SELECT id, status FROM api_message_logs
             WHERE campaign_id = ? AND channel = 'WhatsApp_Unofficial'
             ORDER BY id ASC`,
            [campaignId]
        );
        if (allRows.length === 0) return;

        // Current DB counts
        const dbRead      = allRows.filter(r => r.status === 'read').length;
        const dbDelivered = allRows.filter(r => r.status === 'delivered').length;
        const dbFailed    = allRows.filter(r => r.status === 'failed').length;

        // Rows eligible to be upgraded (currently 'sent')
        const sentRows = allRows.filter(r => r.status === 'sent');

        // How many MORE do we need to upgrade?
        const toMarkRead      = Math.max(0, remoteRead      - dbRead);
        const toMarkDelivered = Math.max(0, remoteDelivered - dbDelivered - toMarkRead);
        const toMarkFailed    = Math.max(0, remoteFailed    - dbFailed);

        let idx = 0;

        // Mark as 'read' (highest value)
        for (let i = 0; i < toMarkRead && idx < sentRows.length; i++, idx++) {
            await query(
                `UPDATE api_message_logs
                 SET status = 'read',
                     delivery_time = COALESCE(delivery_time, NOW()),
                     read_time = COALESCE(read_time, NOW()),
                     updated_at = NOW()
                 WHERE id = ?`,
                [sentRows[idx].id]
            );
        }

        // Mark as 'delivered'
        for (let i = 0; i < toMarkDelivered && idx < sentRows.length; i++, idx++) {
            await query(
                `UPDATE api_message_logs
                 SET status = 'delivered',
                     delivery_time = NOW(),
                     updated_at = NOW()
                 WHERE id = ?`,
                [sentRows[idx].id]
            );
        }

        // Mark as 'failed' (use tail of the list)
        const failCandidates = sentRows.slice(idx);
        for (let i = 0; i < toMarkFailed && i < failCandidates.length; i++) {
            await query(
                `UPDATE api_message_logs
                 SET status = 'failed',
                     failure_reason = 'Message failed on gateway',
                     updated_at = NOW()
                 WHERE id = ?`,
                [failCandidates[i].id]
            );
        }

        // Bulk update campaign counters
        if (toMarkRead > 0) {
            await query(`UPDATE api_campaigns SET delivered_count = delivered_count + ?, read_count = read_count + ? WHERE id = ?`, [toMarkRead, toMarkRead, campaignId]);
        }
        if (toMarkDelivered > 0) {
            await query(`UPDATE api_campaigns SET delivered_count = delivered_count + ? WHERE id = ?`, [toMarkDelivered, campaignId]);
        }
        if (toMarkFailed > 0) {
            await query(`UPDATE api_campaigns SET failed_count = failed_count + ? WHERE id = ?`, [toMarkFailed, campaignId]);
        }

        const totalChanged = toMarkRead + toMarkDelivered + toMarkFailed;
        if (totalChanged > 0) {
            console.log(
                `[WA-POLL] Campaign ${campaignId}: aggregate sync → ` +
                `+${toMarkRead} read, +${toMarkDelivered} delivered, +${toMarkFailed} failed`
            );
        }
    } catch (err) {
        if (err.response?.status === 404) {
            // Campaign cleaned up from Baileys — stop polling it by marking 'staged' rows
            // so they don't appear in the next poll query.
            try {
                await query(
                    `UPDATE api_message_logs
                     SET status = 'sent', updated_at = NOW()
                     WHERE campaign_id = ? AND status = 'staged' AND channel = 'WhatsApp_Unofficial'`,
                    [campaignId]
                );
            } catch (_) {}
        } else {
            console.warn(`[WA-POLL] Campaign ${campaignId} sync error: ${err.message}`);
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main polling loop
// ─────────────────────────────────────────────────────────────────────────────
async function pollActiveCampaigns() {
    if (isPolling) return; // Prevent overlap
    isPolling = true;
    try {
        const [campaigns] = await query(
            `SELECT DISTINCT campaign_id
             FROM api_message_logs
             WHERE channel = 'WhatsApp_Unofficial'
               AND status IN ('sent', 'staged')
               AND send_time >= NOW() - INTERVAL ? HOUR
             LIMIT ?`,
            [ACTIVE_WINDOW_HRS, MAX_CAMPAIGNS_PER_RUN]
        );

        for (const { campaign_id } of campaigns) {
            await syncCampaign(campaign_id);
        }
    } catch (err) {
        console.error('[WA-POLL] Polling loop error:', err.message);
    } finally {
        isPolling = false;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────
function startPolling() {
    console.log(`[WA-POLL] Unofficial WhatsApp status polling started (every ${POLL_INTERVAL_MS / 1000}s)`);
    // First run after 10 seconds so DB is ready
    setTimeout(pollActiveCampaigns, 10000);
    setInterval(pollActiveCampaigns, POLL_INTERVAL_MS);
}

module.exports = { startPolling, syncCampaign };
