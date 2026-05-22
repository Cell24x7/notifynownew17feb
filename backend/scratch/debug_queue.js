#!/usr/bin/env node
/**
 * QUEUE STUCK DEBUGGER
 * node backend/scratch/debug_queue.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.production') });
const mysql = require('mysql2/promise');

const n = (num) => Number(num||0).toLocaleString('en-IN');

async function main() {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME
    });

    console.log('\n══════ QUEUE STUCK DEBUGGER ══════');
    console.log('Time: ' + new Date().toLocaleString('en-IN'));

    // 1. Get stuck campaign IDs
    const [campaigns] = await conn.execute(
        "SELECT id, name FROM campaigns WHERE name LIKE 'Pothys - 22 May 2026%' AND GREATEST(COALESCE(audience_count,0), COALESCE(recipient_count,0)) > 100"
    );
    const ids = campaigns.map(c => c.id);
    const placeholders = ids.map(() => '?').join(',');

    // 2. Queue breakdown by status
    console.log('\n── 1. Queue Status Breakdown ─────────────────');
    const [qStatus] = await conn.execute(
        `SELECT c.name, cq.status, COUNT(*) as cnt, MIN(cq.created_at) as oldest, MAX(cq.updated_at) as newest
         FROM campaign_queue cq
         JOIN campaigns c ON c.id = cq.campaign_id
         WHERE cq.campaign_id IN (${placeholders})
         GROUP BY cq.campaign_id, cq.status
         ORDER BY c.name, cq.status`,
        ids
    );
    if (qStatus.length === 0) {
        console.log('No queue entries found for Pothys campaigns!');
    } else {
        qStatus.forEach(r => {
            console.log(`  ${r.name.split(' - ').pop()} | ${r.status} | count: ${n(r.cnt)} | oldest: ${new Date(r.oldest).toLocaleString('en-IN')} | latest: ${new Date(r.newest).toLocaleString('en-IN')}`);
        });
    }

    // 3. Sample stuck messages
    console.log('\n── 2. Sample Stuck Messages (top 5) ──────────');
    const [stuck] = await conn.execute(
        `SELECT cq.id, cq.campaign_id, c.name, cq.recipient, cq.status, cq.attempts, cq.created_at, cq.updated_at, cq.error_message
         FROM campaign_queue cq
         JOIN campaigns c ON c.id = cq.campaign_id
         WHERE cq.campaign_id IN (${placeholders}) AND cq.status IN ('pending','processing')
         ORDER BY cq.created_at ASC LIMIT 5`,
        ids
    );
    stuck.forEach(r => {
        console.log(`  ID: ${r.id} | Camp: ${r.name.split(' - ').pop()} | Recipient: ${r.recipient} | Status: ${r.status} | Attempts: ${r.attempts} | Error: ${r.error_message || 'none'} | Age: ${Math.round((Date.now() - new Date(r.created_at))/60000)}min`);
    });

    // 4. Check overall queue health
    console.log('\n── 3. Overall Queue Health ────────────────────');
    const [qHealth] = await conn.execute(
        "SELECT status, COUNT(*) as cnt FROM campaign_queue WHERE updated_at >= NOW() - INTERVAL 1 HOUR GROUP BY status"
    );
    qHealth.forEach(r => console.log(`  Last 1hr | ${r.status}: ${n(r.cnt)}`));

    // 5. Check if worker is processing anything
    console.log('\n── 4. Processing Activity (last 5 min) ────────');
    const [activity] = await conn.execute(
        "SELECT COUNT(*) as cnt FROM message_logs WHERE created_at >= NOW() - INTERVAL 5 MINUTE"
    );
    console.log(`  Messages logged in last 5 min: ${n(activity[0].cnt)}`);

    const [activityQ] = await conn.execute(
        "SELECT COUNT(*) as cnt FROM campaign_queue WHERE status = 'processing' AND updated_at >= NOW() - INTERVAL 5 MINUTE"
    );
    console.log(`  Queue items actively processing: ${n(activityQ[0].cnt)}`);

    // 6. Check if these 880 are truly stuck (no attempts or max attempts reached)
    console.log('\n── 5. Stuck Analysis ──────────────────────────');
    const [stuckAnalysis] = await conn.execute(
        `SELECT 
            SUM(CASE WHEN attempts = 0 THEN 1 ELSE 0 END) as never_tried,
            SUM(CASE WHEN attempts >= 3 THEN 1 ELSE 0 END) as max_attempts,
            SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as currently_processing,
            SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
            MAX(attempts) as max_attempt_count,
            MIN(created_at) as oldest_entry
         FROM campaign_queue
         WHERE campaign_id IN (${placeholders}) AND status IN ('pending','processing')`,
        ids
    );
    const sa = stuckAnalysis[0];
    console.log(`  Never tried (attempts=0): ${n(sa.never_tried)}`);
    console.log(`  Max attempts reached (>=3): ${n(sa.max_attempts)}`);
    console.log(`  Currently processing: ${n(sa.currently_processing)}`);
    console.log(`  Pending (waiting): ${n(sa.pending)}`);
    console.log(`  Max attempt count seen: ${sa.max_attempt_count}`);
    console.log(`  Oldest entry: ${sa.oldest_entry ? new Date(sa.oldest_entry).toLocaleString('en-IN') : 'N/A'}`);

    // 7. Force-fix option info
    console.log('\n── 6. Diagnosis ───────────────────────────────');
    if (Number(sa.max_attempts) > 0) {
        console.log('  ⚠️  Some messages have hit max retry limit — they wont retry automatically');
        console.log('  FIX: Run the force-complete command below');
    }
    if (Number(sa.currently_processing) > 0) {
        console.log('  ⚠️  Some are stuck in "processing" state — worker may have crashed mid-send');
        console.log('  FIX: Reset stuck processing items to pending');
    }
    if (Number(sa.never_tried) > 0) {
        console.log('  ⚠️  Some messages never tried — worker not picking them up');
        console.log('  FIX: PM2 restart may help');
    }

    console.log('\n══════════════════════════════════════════════');
    await conn.end();
}
main().catch(e => {
    console.error('Error:', e.message);
    process.exit(1);
});
