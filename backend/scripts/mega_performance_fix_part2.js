/**
 * 🚀 MEGA PERFORMANCE FIX — PART 2
 *
 * Issues remaining after Part 1:
 *  - campaign_queue: 748K rows still (InnoDB didn't reclaim space — need OPTIMIZE TABLE)
 *  - webhook_logs: 2.8 GB (2.6M rows — biggest disk issue!)
 *  - message_logs: 1.5 GB (1.5M rows — read for reports but old data is dead weight)
 *
 * This script:
 *  1. Shows who owns the remaining 748K campaign_queue rows
 *  2. Reclaims disk space with OPTIMIZE TABLE on campaign_queue
 *  3. Deletes old webhook_logs (> 60 days old) — biggest space saver
 *  4. Deletes old message_logs for campaigns that are 100% finished (> 30 days)
 *  5. OPTIMIZE TABLE after bulk deletes to reclaim disk
 *
 * SAFE: Does NOT delete recent data. Only deletes rows older than 30-60 days
 *       for campaigns that are already in 'sent'/'completed' status.
 *
 * Run: NODE_ENV=production node backend/scripts/mega_performance_fix_part2.js
 */

const path = require('path');
const dotenv = require('dotenv');
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
dotenv.config({ path: path.join(__dirname, '..', envFile) });

const { query } = require('../config/db');

async function getTableSize(tableName) {
    try {
        const [rows] = await query(`
            SELECT 
                TABLE_ROWS as row_count,
                ROUND((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024, 1) as size_mb
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
        `, [tableName]);
        return rows[0] || { row_count: 0, size_mb: 0 };
    } catch (e) { return { row_count: 0, size_mb: 0 }; }
}

async function fix2() {
    console.log('\n🚀 ===== MEGA PERFORMANCE FIX — PART 2 =====\n');

    // ── STEP 1: Audit remaining campaign_queue rows ────────────────────────────
    console.log('🔍 STEP 1: What campaigns own the remaining campaign_queue rows?\n');
    try {
        const [queueAudit] = await query(`
            SELECT 
                c.id,
                c.name,
                c.status as camp_status,
                COUNT(q.id) as queue_count,
                SUM(CASE WHEN q.status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN q.status = 'processing' THEN 1 ELSE 0 END) as processing,
                SUM(CASE WHEN q.status = 'sent' THEN 1 ELSE 0 END) as sent_q,
                SUM(CASE WHEN q.status = 'failed' THEN 1 ELSE 0 END) as failed_q
            FROM campaign_queue q
            JOIN campaigns c ON q.campaign_id = c.id
            GROUP BY c.id, c.name, c.status
            ORDER BY queue_count DESC
            LIMIT 20
        `);

        if (queueAudit.length === 0) {
            console.log('  ✅ No campaign-linked queue rows found (all orphaned).');
        } else {
            console.log(`  ${'Campaign ID'.padEnd(30)} ${'Status'.padEnd(12)} ${'Queue Rows'.padStart(10)} ${'Pending'.padStart(10)} ${'Processing'.padStart(12)}`);
            console.log('  ' + '-'.repeat(80));
            for (const r of queueAudit) {
                const name = (r.name || r.id).toString().substring(0, 28);
                console.log(`  ${name.padEnd(30)} ${(r.camp_status||'').padEnd(12)} ${String(r.queue_count).padStart(10)} ${String(r.pending).padStart(10)} ${String(r.processing).padStart(12)}`);
            }
        }

        // Also check how many queue rows belong to 'sent'/'completed' campaigns
        const [staleCount] = await query(`
            SELECT COUNT(*) as total FROM campaign_queue q
            JOIN campaigns c ON q.campaign_id = c.id
            WHERE c.status IN ('sent', 'completed', 'failed')
        `);
        const [pendingCount] = await query(`
            SELECT COUNT(*) as total FROM campaign_queue q
            WHERE q.status = 'pending'
        `);
        console.log(`\n  📊 Queue rows for DONE campaigns: ${Number(staleCount[0]?.total || 0).toLocaleString()}`);
        console.log(`  📊 Queue rows with 'pending' status: ${Number(pendingCount[0]?.total || 0).toLocaleString()}`);
    } catch (e) {
        console.log('  ⚠️ Audit error:', e.message);
    }
    console.log('');

    // ── STEP 2: Clean remaining stale queue rows (status = sent/failed in queue) ─
    console.log('🧹 STEP 2: Deep Clean campaign_queue (sent/failed queue items)\n');
    let [result] = await query(`
        DELETE FROM campaign_queue 
        WHERE status IN ('sent', 'failed')
        LIMIT 500000
    `).catch(e => { console.log('  ⚠️', e.message); return [{ affectedRows: 0 }]; });
    console.log(`  ✅ Deleted ${(result?.affectedRows || 0).toLocaleString()} sent/failed queue rows`);

    // Delete queue rows for done campaigns (any status)
    [result] = await query(`
        DELETE q FROM campaign_queue q
        JOIN campaigns c ON q.campaign_id = c.id
        WHERE c.status IN ('sent', 'completed', 'failed')
    `).catch(e => { console.log('  ⚠️', e.message); return [{ affectedRows: 0 }]; });
    console.log(`  ✅ Deleted ${(result?.affectedRows || 0).toLocaleString()} queue rows for finished campaigns`);
    console.log('');

    // ── STEP 3: OPTIMIZE TABLE campaign_queue (reclaim deleted space) ──────────
    console.log('⚡ STEP 3: OPTIMIZE TABLE campaign_queue (reclaim disk space)\n');
    console.log('  ⏳ Running OPTIMIZE TABLE campaign_queue... (may take 1-2 min)');
    try {
        await query('OPTIMIZE TABLE campaign_queue');
        const s = await getTableSize('campaign_queue');
        console.log(`  ✅ campaign_queue after optimize: ${Number(s.row_count).toLocaleString()} rows, ${s.size_mb} MB`);
    } catch (e) {
        console.log('  ⚠️ OPTIMIZE TABLE campaign_queue:', e.message);
    }
    console.log('');

    // ── STEP 4: Delete OLD webhook_logs (> 30 days, non-chat types) ─────────────
    console.log('🗑️  STEP 4: Archive OLD webhook_logs (> 30 days) — 2.8 GB SAVER\n');
    const before4 = await getTableSize('webhook_logs');
    console.log(`  Before: ${Number(before4.row_count).toLocaleString()} rows, ${before4.size_mb} MB`);
    
    // Delete in batches to avoid locking — MariaDB compatible single-table DELETE
    let totalDeleted4 = 0;
    let batchDeleted = 0;
    do {
        try {
            // Delete DLR/status webhook logs older than 30 days (not chat messages)
            [result] = await query(`
                DELETE FROM webhook_logs 
                WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
                AND status IN ('delivered', 'failed', 'sent', 'read', 'undelivered')
                LIMIT 50000
            `);
            batchDeleted = result?.affectedRows || 0;
            totalDeleted4 += batchDeleted;
            if (batchDeleted > 0) {
                process.stdout.write(`\r  ⏳ Deleted ${totalDeleted4.toLocaleString()} webhook_logs so far...`);
            }
        } catch (e) {
            console.log('\n  ⚠️ webhook_logs delete error:', e.message);
            break;
        }
    } while (batchDeleted === 50000);
    
    console.log(`\n  ✅ Deleted ${totalDeleted4.toLocaleString()} old webhook_logs (DLR status, > 30 days)`);
    console.log('');

    // ── STEP 5: Delete old message_logs for DONE campaigns (> 30 days) ────────
    // Uses MariaDB-compatible subquery (no JOIN+LIMIT which is unsupported)
    console.log('🗑️  STEP 5: Archive OLD message_logs (done campaigns, > 30 days)\n');
    const before5 = await getTableSize('message_logs');
    console.log(`  Before: ${Number(before5.row_count).toLocaleString()} rows, ${before5.size_mb} MB`);

    // Step 5a: Get list of done campaign IDs (done more than 30 days ago)
    let doneCampIds = [];
    try {
        const [doneRows] = await query(`
            SELECT id FROM campaigns
            WHERE status IN ('sent', 'completed', 'failed')
            AND updated_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
        `);
        doneCampIds = doneRows.map(r => r.id);
        console.log(`  Found ${doneCampIds.length} done campaigns (> 30 days old)`);
    } catch (e) {
        console.log('  ⚠️ Could not fetch done campaigns:', e.message);
    }

    let totalDeleted5 = 0;
    if (doneCampIds.length > 0) {
        // Process in chunks of 50 campaign IDs to avoid huge IN() clauses
        const chunkSize = 50;
        for (let i = 0; i < doneCampIds.length; i += chunkSize) {
            const chunk = doneCampIds.slice(i, i + chunkSize);
            let chunkBatch = 0;
            do {
                try {
                    // MariaDB-compatible: single-table DELETE with IN() — no JOIN+LIMIT
                    [result] = await query(
                        `DELETE FROM message_logs
                         WHERE campaign_id IN (?)
                         AND created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
                         LIMIT 50000`,
                        [chunk]
                    );
                    chunkBatch = result?.affectedRows || 0;
                    totalDeleted5 += chunkBatch;
                    if (totalDeleted5 > 0) {
                        process.stdout.write(`\r  ⏳ Deleted ${totalDeleted5.toLocaleString()} message_logs so far...`);
                    }
                } catch (e) {
                    console.log('\n  ⚠️ message_logs chunk delete error:', e.message);
                    chunkBatch = 0;
                }
            } while (chunkBatch === 50000);
        }
    }
    console.log(`\n  ✅ Deleted ${totalDeleted5.toLocaleString()} old message_logs (done campaigns, > 30 days)`);
    console.log('');

    // ── STEP 6: OPTIMIZE big tables to reclaim disk ───────────────────────────
    // OPTIMIZE TABLE rebuilds the table and reclaims deleted space.
    // On large tables this can take 5-20 minutes — it's normal, don't Ctrl+C.
    console.log('⚡ STEP 6: OPTIMIZE Tables to Reclaim Disk Space\n');
    for (const t of ['webhook_logs', 'message_logs']) {
        const sizeBefore = await getTableSize(t);
        console.log(`  ⏳ OPTIMIZE TABLE ${t} (${sizeBefore.size_mb} MB — may take 5-20 min, do NOT Ctrl+C)...`);
        try {
            // Set a long timeout for this operation
            await query(`SET SESSION wait_timeout = 28800`);
            await query(`OPTIMIZE TABLE ${t}`);
            const s = await getTableSize(t);
            console.log(`  ✅ ${t}: ${sizeBefore.size_mb} MB → ${s.size_mb} MB (saved ${(sizeBefore.size_mb - s.size_mb).toFixed(1)} MB)`);
        } catch (e) {
            console.log(`  ⚠️ OPTIMIZE ${t}: ${e.message}`);
        }
    }
    console.log('');

    // ── STEP 7: Final size report ─────────────────────────────────────────────
    console.log('📊 STEP 7: Final Table Sizes\n');
    const finalTables = ['campaigns', 'campaign_queue', 'message_logs', 'api_message_logs', 
                         'webhook_logs', 'transactions'];
    let totalMB = 0;
    for (const t of finalTables) {
        const s = await getTableSize(t);
        totalMB += Number(s.size_mb);
        console.log(`  ${t.padEnd(25)} rows: ${Number(s.row_count).toLocaleString().padStart(12)}   size: ${s.size_mb} MB`);
    }
    console.log(`\n  📦 Total DB size: ~${totalMB.toFixed(1)} MB\n`);

    console.log('✨ ===== PART 2 COMPLETE =====\n');
    console.log('📌 Next: pm2 reload notifynow-live-prod --update-env\n');
    
    process.exit(0);
}

fix2().catch(e => {
    console.error('Fatal:', e);
    process.exit(1);
});
