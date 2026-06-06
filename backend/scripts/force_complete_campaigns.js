/**
 * 🔧 FORCE COMPLETE STUCK CAMPAIGNS + RECALCULATE REPORTS
 *
 * Problem: Pothys June 5 campaigns stuck in 'running' for 2 days
 * Action:
 *  1. Find all stuck 'running' campaigns (older than 12 hours)
 *  2. Count actual sent/delivered/failed from message_logs (ground truth)
 *  3. Update campaign with correct counts
 *  4. Mark as 'sent'
 *  5. Delete remaining queue items (they won't be processed)
 *  6. Clean Redis keys
 *  7. Print client-ready final report
 *
 * Run: NODE_ENV=production node backend/scripts/force_complete_campaigns.js
 */

const path = require('path');
const dotenv = require('dotenv');
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
dotenv.config({ path: path.join(__dirname, '..', envFile) });

const { query } = require('../config/db');

let redisClient = null;
let envSuffix = 'prod';
try {
    const { redisClient: rc, envSuffix: es } = require('../services/queueService');
    if (rc) { redisClient = rc; envSuffix = es || 'prod'; }
} catch (e) {}

// Also try direct Redis connection
try {
    if (!redisClient) {
        const Redis = require('ioredis');
        const { redisConnection } = require('../queues/campaignQueue');
        redisClient = new Redis(redisConnection);
        redisClient.on('error', () => {});
    }
} catch (e) {}

async function forceComplete() {
    console.log('\n🔧 ===== FORCE COMPLETE STUCK CAMPAIGNS =====\n');

    // ── Step 1: Find all stuck running campaigns ───────────────────────────────
    console.log('🔍 Step 1: Finding stuck running campaigns...\n');
    const [stuckCampaigns] = await query(`
        SELECT 
            c.id, c.name, c.channel, c.user_id,
            c.recipient_count, c.audience_count,
            c.sent_count, c.delivered_count, c.failed_count, c.read_count,
            c.created_at, c.updated_at,
            u.name as user_name, u.email as user_email, u.company,
            (SELECT COUNT(*) FROM campaign_queue q WHERE q.campaign_id = c.id AND q.status = 'pending') as q_pending,
            (SELECT COUNT(*) FROM campaign_queue q WHERE q.campaign_id = c.id AND q.status = 'processing') as q_processing,
            (SELECT COUNT(*) FROM campaign_queue q WHERE q.campaign_id = c.id AND q.status = 'sent') as q_sent
        FROM campaigns c
        JOIN users u ON c.user_id = u.id
        WHERE c.status = 'running'
        AND c.created_at < DATE_SUB(NOW(), INTERVAL 12 HOUR)
        ORDER BY c.created_at ASC
    `);

    if (stuckCampaigns.length === 0) {
        console.log('  ✅ No stuck campaigns found (all running < 12 hours old).\n');
        process.exit(0);
    }

    console.log(`  Found ${stuckCampaigns.length} stuck campaigns:\n`);
    for (const c of stuckCampaigns) {
        const total = Math.max(c.recipient_count || 0, c.audience_count || 0);
        console.log(`  📌 ${c.name}`);
        console.log(`     ID: ${c.id} | Channel: ${c.channel} | Company: ${c.company}`);
        console.log(`     Total: ${total.toLocaleString()} | Queue pending: ${Number(c.q_pending).toLocaleString()} | Processing: ${Number(c.q_processing).toLocaleString()}`);
        console.log(`     Created: ${new Date(c.created_at).toLocaleString('en-IN')}`);
        console.log('');
    }

    // ── Step 2: Force complete each campaign ───────────────────────────────────
    console.log('⚡ Step 2: Force completing campaigns...\n');

    const completedCampaigns = [];

    for (const camp of stuckCampaigns) {
        console.log(`  🔄 Processing: ${camp.name}`);

        // Get true counts from message_logs (consistent with recalculate_all_reports.js)
        const [logStats] = await query(`
            SELECT 
                COALESCE(SUM(is_sent), 0) as total_logged,
                COALESCE(SUM(is_sent), 0) as sent_count,
                COALESCE(SUM(is_delivered), 0) as delivered_count,
                COALESCE(SUM(is_read), 0) as read_count,
                COALESCE(SUM(CASE WHEN is_delivered = 0 AND is_failed = 1 THEN 1 ELSE 0 END), 0) as failed_count
            FROM (
                SELECT recipient,
                       MAX(1) as is_sent,
                       MAX(CASE WHEN status IN ('read', 'displayed', 'read_receipt', 'delivered') THEN 1 ELSE 0 END) as is_delivered,
                       MAX(CASE WHEN status IN ('read', 'displayed', 'read_receipt') THEN 1 ELSE 0 END) as is_read,
                       MAX(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as is_failed
                FROM message_logs
                WHERE campaign_id = ?
                GROUP BY recipient
            ) as t
        `, [camp.id]);

        const stats = logStats[0] || {};
        const trueTotal = Math.max(
            camp.recipient_count || 0,
            camp.audience_count || 0,
            stats.total_logged || 0
        );
        const trueSent = Math.max(stats.sent_count || 0, camp.sent_count || 0);
        const trueDelivered = Math.max(stats.delivered_count || 0, camp.delivered_count || 0);
        const trueRead = Math.max(stats.read_count || 0, camp.read_count || 0);
        const trueFailed = Math.max(stats.failed_count || 0, camp.failed_count || 0);

        console.log(`     Logs: sent=${trueSent.toLocaleString()} delivered=${trueDelivered.toLocaleString()} failed=${trueFailed.toLocaleString()}`);

        // Update campaign with true counts and mark as sent
        await query(`
            UPDATE campaigns SET
                status = 'sent',
                sent_count = ?,
                delivered_count = ?,
                read_count = ?,
                failed_count = ?,
                recipient_count = ?
            WHERE id = ?
        `, [trueSent, trueDelivered, trueRead, trueFailed, trueTotal, camp.id]);

        // Delete remaining queue items for this campaign
        const [delResult] = await query(`
            DELETE FROM campaign_queue WHERE campaign_id = ?
        `, [camp.id]);
        console.log(`     ✅ Marked as SENT | Cleared ${(delResult?.affectedRows || 0).toLocaleString()} queue items`);

        // Clean Redis keys
        if (redisClient) {
            try {
                await redisClient.del(`${envSuffix}:camp_progress:${camp.id}`);
                await redisClient.del(`${envSuffix}:stats:${camp.id}`);
                await redisClient.del(`${envSuffix}:tracked:${camp.id}`);
                await redisClient.del(`${envSuffix}:tracked_fail:${camp.id}`);
                console.log(`     ✅ Redis keys cleaned`);
            } catch (e) {}
        }

        completedCampaigns.push({
            ...camp,
            trueSent, trueDelivered, trueRead, trueFailed, trueTotal
        });
        console.log('');
    }

    // ── Step 3: Also fix paused campaigns with old data ────────────────────────
    console.log('🧹 Step 3: Clean up old PAUSED campaign queue items...\n');
    const [pausedClean] = await query(`
        DELETE q FROM campaign_queue q
        JOIN campaigns c ON q.campaign_id = c.id
        WHERE c.status IN ('paused', 'failed')
        AND q.status IN ('pending', 'failed')
        AND c.created_at < DATE_SUB(NOW(), INTERVAL 7 DAY)
    `).catch(() => [{ affectedRows: 0 }]);
    console.log(`  ✅ Cleaned ${(pausedClean?.affectedRows || 0).toLocaleString()} old paused campaign queue items\n`);

    // ── Step 4: Print Client-Ready Report ─────────────────────────────────────
    console.log('\n📊 ===== FINAL CLIENT REPORT =====\n');
    console.log(`  Report generated: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST\n`);

    // Group by company/user
    const byUser = {};
    for (const c of completedCampaigns) {
        const key = c.company || c.user_name || c.user_email;
        if (!byUser[key]) byUser[key] = [];
        byUser[key].push(c);
    }

    for (const [company, campaigns] of Object.entries(byUser)) {
        console.log(`  🏢 ${company}`);
        console.log(`  ${'─'.repeat(70)}`);

        let companyTotal = 0, companySent = 0, companyDelivered = 0, companyFailed = 0, companyRead = 0;

        for (const c of campaigns) {
            companyTotal += c.trueTotal;
            companySent += c.trueSent;
            companyDelivered += c.trueDelivered;
            companyFailed += c.trueFailed;
            companyRead += c.trueRead;

            const deliveryRate = c.trueSent > 0 ? ((c.trueDelivered / c.trueSent) * 100).toFixed(1) : '0.0';
            console.log(`  📌 ${c.name}`);
            console.log(`     Channel : ${(c.channel || '').toUpperCase()}`);
            console.log(`     Total   : ${c.trueTotal.toLocaleString()}`);
            console.log(`     Sent    : ${c.trueSent.toLocaleString()}`);
            console.log(`     Delivered: ${c.trueDelivered.toLocaleString()} (${deliveryRate}%)`);
            if (c.channel !== 'sms') {
                console.log(`     Read    : ${c.trueRead.toLocaleString()}`);
            }
            console.log(`     Failed  : ${c.trueFailed.toLocaleString()}`);
            console.log('');
        }

        const overallDelivery = companySent > 0 ? ((companyDelivered / companySent) * 100).toFixed(1) : '0.0';
        console.log(`  📈 TOTAL for ${company}:`);
        console.log(`     Total Base : ${companyTotal.toLocaleString()}`);
        console.log(`     Sent       : ${companySent.toLocaleString()}`);
        console.log(`     Delivered  : ${companyDelivered.toLocaleString()} (${overallDelivery}%)`);
        console.log(`     Failed     : ${companyFailed.toLocaleString()}`);
        console.log(`     Read       : ${companyRead.toLocaleString()}`);
        console.log(`  ${'─'.repeat(70)}\n`);
    }

    console.log('✨ ===== FORCE COMPLETE DONE =====\n');
    console.log('📌 Next steps:');
    console.log('   1. pm2 reload notifynow-live-prod --update-env');
    console.log('   2. Check campaigns page — all should show "sent" ✅\n');

    if (redisClient) {
        try { await redisClient.quit(); } catch (e) {}
    }
    process.exit(0);
}

forceComplete().catch(e => {
    console.error('Fatal:', e.message);
    process.exit(1);
});
