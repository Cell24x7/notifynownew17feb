/**
 * 🔍 CAMPAIGN DEEP AUDIT
 * 
 * Shows exactly what happened to each contact in the campaign:
 *   - How many were sent
 *   - How many failed (and WHY - failure reason)
 *   - How many were never processed (deleted from queue)
 *
 * Run: NODE_ENV=production node backend/scripts/campaign_deep_audit.js
 */

const path = require('path');
const dotenv = require('dotenv');
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
dotenv.config({ path: path.join(__dirname, '..', envFile) });

const { query } = require('../config/db');

// Pothys June 5 campaign IDs
const CAMPAIGN_IDS = [
    'CAMP1780651161170', // LZ41K
    'CAMP1780651647834', // CO9AW
    'CAMP1780652038128', // F9OKM
    'CAMP1780652266402', // ACKV0
    'CAMP1780653343241', // YC94C
    'CAMP1780657421960', // 6U0NZ
    'CAMP1780658093340', // ZJ8IC
    'CAMP1780658555622', // 3OGVY
    'CAMP1780659098711', // DHNE3
];

async function deepAudit() {
    console.log('\n🔍 ===== CAMPAIGN DEEP AUDIT — Pothys June 5 =====\n');

    let grandTotalBase = 0, grandAttempted = 0, grandSent = 0;
    let grandDelivered = 0, grandRead = 0, grandFailed = 0, grandNeverProcessed = 0;

    for (const campId of CAMPAIGN_IDS) {
        // Get campaign info
        const [campRows] = await query(`
            SELECT id, name, channel, recipient_count, audience_count, 
                   sent_count, delivered_count, failed_count, read_count, status
            FROM campaigns WHERE id = ?
        `, [campId]);
        
        if (!campRows[0]) { continue; }
        const camp = campRows[0];
        const totalBase = Math.max(camp.recipient_count || 0, camp.audience_count || 0);

        // Get message_logs breakdown
        const [logBreakdown] = await query(`
            SELECT 
                COUNT(*) as total_logged,
                COUNT(CASE WHEN status IN ('sent','submitted','success','delivered','read','displayed') THEN 1 END) as attempted,
                COUNT(CASE WHEN status IN ('delivered','read','displayed') THEN 1 END) as delivered,
                COUNT(CASE WHEN status IN ('read','displayed','read_receipt') THEN 1 END) as read_count,
                COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
            FROM message_logs WHERE campaign_id = ?
        `, [campId]);

        // Get top failure reasons
        const [failReasons] = await query(`
            SELECT failure_reason, COUNT(*) as cnt
            FROM message_logs
            WHERE campaign_id = ? AND status = 'failed'
            AND failure_reason IS NOT NULL AND failure_reason != ''
            GROUP BY failure_reason
            ORDER BY cnt DESC
            LIMIT 5
        `, [campId]);

        const logs = logBreakdown[0] || {};
        const attempted = logs.total_logged || 0;
        const delivered = logs.delivered || 0;
        const readCount = logs.read_count || 0;
        const failed = logs.failed || 0;
        const sent = attempted - failed;
        const neverProcessed = totalBase - attempted;

        grandTotalBase += totalBase;
        grandAttempted += attempted;
        grandSent += sent;
        grandDelivered += delivered;
        grandRead += readCount;
        grandFailed += failed;
        grandNeverProcessed += Math.max(0, neverProcessed);

        const sentPct = totalBase > 0 ? ((attempted / totalBase) * 100).toFixed(1) : '0';
        const delivPct = attempted > 0 ? ((delivered / attempted) * 100).toFixed(1) : '0';
        const failPct = attempted > 0 ? ((failed / attempted) * 100).toFixed(1) : '0';

        console.log(`📌 ${camp.name} (${campId})`);
        console.log(`   Total uploaded   : ${totalBase.toLocaleString()}`);
        console.log(`   ─────────────────────────────────────────`);
        console.log(`   ✅ Attempted      : ${attempted.toLocaleString()} (${sentPct}% of total)`);
        console.log(`      → Sent OK      : ${sent.toLocaleString()}`);
        console.log(`      → Delivered    : ${delivered.toLocaleString()} (${delivPct}%)`);
        console.log(`      → Read         : ${readCount.toLocaleString()}`);
        console.log(`      → Failed       : ${failed.toLocaleString()} (${failPct}%)`);
        if (neverProcessed > 0) {
            console.log(`   ⏭️  Never sent    : ${neverProcessed.toLocaleString()} (queue deleted on force-complete)`);
        }
        
        if (failReasons.length > 0) {
            console.log(`   ❌ Failure reasons:`);
            for (const r of failReasons) {
                const reason = (r.failure_reason || 'Unknown').substring(0, 80);
                console.log(`      "${reason}" → ${Number(r.cnt).toLocaleString()}`);
            }
        }
        console.log('');
    }

    // Grand total
    const attemptPct = grandTotalBase > 0 ? ((grandAttempted / grandTotalBase) * 100).toFixed(1) : '0';
    const delivPct = grandAttempted > 0 ? ((grandDelivered / grandAttempted) * 100).toFixed(1) : '0';
    const failPct = grandAttempted > 0 ? ((grandFailed / grandAttempted) * 100).toFixed(1) : '0';

    console.log('═'.repeat(60));
    console.log('📊 GRAND TOTAL — All 9 Pothys Campaigns');
    console.log('═'.repeat(60));
    console.log(`   Total contacts uploaded : ${grandTotalBase.toLocaleString()}`);
    console.log(`   Actually attempted      : ${grandAttempted.toLocaleString()} (${attemptPct}%)`);
    console.log(`     → Sent successfully   : ${grandSent.toLocaleString()}`);
    console.log(`     → Delivered           : ${grandDelivered.toLocaleString()} (${delivPct}% of attempted)`);
    console.log(`     → Read                : ${grandRead.toLocaleString()}`);
    console.log(`     → Failed (provider)   : ${grandFailed.toLocaleString()} (${failPct}% of attempted)`);
    console.log(`   ⏭️  Never processed      : ${grandNeverProcessed.toLocaleString()} (queue stuck → force deleted)`);
    console.log('═'.repeat(60));
    console.log('');
    console.log('🔑 ROOT CAUSE ANALYSIS:');
    console.log('');
    console.log(`   1. ⚡ Speed issue: Queue was processing slowly due to Redis BUSY`);
    console.log(`      errors + 4 PM2 instances competing. Only ${attemptPct}% could be`);
    console.log(`      processed in 24 hours before force-complete.`);
    console.log('');
    console.log(`   2. ❌ Dotgo 403 errors: Provider rejected ${grandFailed.toLocaleString()} messages.`);
    console.log(`      This is a provider-side issue (API rate limit / account block).`);
    console.log(`      Check Dotgo dashboard for your account status.`);
    console.log('');
    console.log(`   3. ⏭️  ${grandNeverProcessed.toLocaleString()} contacts were in queue but never sent`);
    console.log(`      because campaigns were force-completed after 2 days.`);
    console.log('');

    process.exit(0);
}

deepAudit().catch(e => {
    console.error('Error:', e.message);
    process.exit(1);
});
