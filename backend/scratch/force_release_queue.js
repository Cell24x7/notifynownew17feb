#!/usr/bin/env node
/**
 * QUEUE FORCE RELEASE — Stuck 'processing' items ko wapas 'pending' karo
 * node backend/scratch/force_release_queue.js
 *
 * Safely resets ONLY old stuck 'processing' items (older than 30 min)
 * back to 'pending' so the worker picks them up again.
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

    console.log('\n══════ QUEUE FORCE RELEASE ══════');
    console.log('Time: ' + new Date().toLocaleString('en-IN'));

    // 1. Show what we will fix BEFORE doing it
    const [preview] = await conn.execute(`
        SELECT cq.status, COUNT(*) as cnt, MIN(cq.updated_at) as oldest_stuck
        FROM campaign_queue cq
        JOIN campaigns c ON c.id = cq.campaign_id
        WHERE c.name LIKE 'Pothys - 22 May 2026%'
        AND GREATEST(COALESCE(c.audience_count,0), COALESCE(c.recipient_count,0)) > 100
        GROUP BY cq.status
    `);

    console.log('\nCurrent queue state for Pothys campaigns:');
    preview.forEach(r => {
        const age = r.oldest_stuck ? Math.round((Date.now() - new Date(r.oldest_stuck))/60000) : 0;
        console.log(`  ${r.status}: ${n(r.cnt)} items | oldest: ${age} min ago`);
    });

    // 2. Reset stuck 'processing' items older than 30 min → 'pending'
    const [resetResult] = await conn.execute(`
        UPDATE campaign_queue cq
        JOIN campaigns c ON c.id = cq.campaign_id
        SET cq.status = 'pending', cq.worker_id = NULL, cq.updated_at = NOW()
        WHERE cq.status = 'processing'
        AND c.name LIKE 'Pothys - 22 May 2026%'
        AND GREATEST(COALESCE(c.audience_count,0), COALESCE(c.recipient_count,0)) > 100
        AND cq.updated_at < NOW() - INTERVAL 30 MINUTE
    `);
    console.log(`\n✅ Reset ${n(resetResult.affectedRows)} stuck 'processing' items → 'pending'`);

    // 3. Also reset any 'pending' items whose campaign got stuck in RUNNING state
    //    but are not being picked up (safety check)
    const [campCheck] = await conn.execute(`
        SELECT c.id, c.name, c.status, COUNT(cq.id) as pending_count
        FROM campaigns c
        JOIN campaign_queue cq ON cq.campaign_id = c.id AND cq.status = 'pending'
        WHERE c.name LIKE 'Pothys - 22 May 2026%'
        AND GREATEST(COALESCE(c.audience_count,0), COALESCE(c.recipient_count,0)) > 100
        GROUP BY c.id
    `);

    console.log('\nPending items per campaign (after reset):');
    campCheck.forEach(r => {
        console.log(`  ${r.name.split(' - ').pop()} | Campaign status: ${r.status} | Pending: ${n(r.pending_count)}`);
    });

    // 4. If campaign status is 'sent' but still has pending queue items, fix it to 'running'
    const stuckCamps = campCheck.filter(r => r.status === 'sent' && r.pending_count > 0);
    if (stuckCamps.length > 0) {
        console.log(`\n⚠️  Found ${stuckCamps.length} campaigns marked 'sent' but still have pending items — fixing...`);
        for (const c of stuckCamps) {
            await conn.execute("UPDATE campaigns SET status = 'running' WHERE id = ?", [c.id]);
            console.log(`  ✅ ${c.name.split(' - ').pop()} → status set to 'running'`);
        }
    }

    // 5. Verify final state
    const [after] = await conn.execute(`
        SELECT cq.status, COUNT(*) as cnt
        FROM campaign_queue cq
        JOIN campaigns c ON c.id = cq.campaign_id
        WHERE c.name LIKE 'Pothys - 22 May 2026%'
        AND GREATEST(COALESCE(c.audience_count,0), COALESCE(c.recipient_count,0)) > 100
        GROUP BY cq.status
    `);

    console.log('\nQueue state AFTER fix:');
    let totalPending = 0;
    after.forEach(r => {
        console.log(`  ${r.status}: ${n(r.cnt)}`);
        if (r.status === 'pending') totalPending = r.cnt;
    });

    console.log('\n══════════════════════════════════════════════');
    if (totalPending > 0) {
        console.log('✅ ' + n(totalPending) + ' messages are now PENDING — worker will pick them up automatically');
        console.log('   Worker runs every 15 seconds — wait 30 sec then check: node backend/scratch/check_pothys.js');
    } else {
        console.log('✅ No pending items remain — all done!');
    }

    await conn.end();
}
main().catch(e => {
    console.error('❌ Error:', e.message);
    process.exit(1);
});
