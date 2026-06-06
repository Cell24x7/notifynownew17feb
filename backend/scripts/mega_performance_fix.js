/**
 * 🚀 MEGA PERFORMANCE FIX SCRIPT
 * 
 * Root cause: 12 lakh campaign sends filled message_logs, campaign_queue with
 * millions of rows. No proper indexes = full table scans on every API call.
 *
 * This script:
 *  1. Adds all critical missing indexes
 *  2. Cleans up orphaned/completed campaign_queue rows (frees disk + speed)
 *  3. Analyzes tables so MySQL uses the new indexes immediately
 *  4. Shows table size stats
 *
 * Run: NODE_ENV=production node backend/scripts/mega_performance_fix.js
 */

const path = require('path');
const dotenv = require('dotenv');
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
dotenv.config({ path: path.join(__dirname, '..', envFile) });

const { query } = require('../config/db');

async function indexExists(tableName, indexName) {
    try {
        const [rows] = await query(
            `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS 
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1`,
            [tableName, indexName]
        );
        return rows && rows.length > 0;
    } catch (e) { return false; }
}

async function safeAddIndex(table, indexName, cols) {
    try {
        const exists = await indexExists(table, indexName);
        if (exists) {
            console.log(`  ⚡ SKIP  ${table}.${indexName} — already exists`);
            return;
        }
        process.stdout.write(`  ⏳ ADD   ${table}.${indexName} ${cols}... `);
        await query(`ALTER TABLE ${table} ADD INDEX ${indexName} ${cols}`);
        console.log('✅');
    } catch (err) {
        console.log(`⚠️ ${err.message}`);
    }
}

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

async function megaFix() {
    console.log('\n🚀 ===== MEGA PERFORMANCE FIX =====\n');

    // ── STEP 1: Show current table sizes ──────────────────────────────────────
    console.log('📊 STEP 1: Current Table Sizes');
    const tables = ['campaigns', 'api_campaigns', 'campaign_queue', 'api_campaign_queue', 
                    'message_logs', 'api_message_logs', 'webhook_logs', 'transactions'];
    for (const t of tables) {
        const s = await getTableSize(t);
        const rowStr = Number(s.row_count).toLocaleString();
        console.log(`  ${t.padEnd(25)} rows: ${rowStr.padStart(12)}   size: ${s.size_mb} MB`);
    }
    console.log('');

    // ── STEP 2: Critical Indexes ──────────────────────────────────────────────
    console.log('📊 STEP 2: Adding Critical Indexes\n');

    // campaigns - main list, dashboard, reports all filter by user_id + created_at + status
    await safeAddIndex('campaigns', 'idx_user_created',   '(user_id, created_at)');
    await safeAddIndex('campaigns', 'idx_user_status',    '(user_id, status)');
    await safeAddIndex('campaigns', 'idx_status_created', '(status, created_at)');
    await safeAddIndex('campaigns', 'idx_created_at',     '(created_at)');
    await safeAddIndex('campaigns', 'idx_channel_created','(channel, created_at)');

    // api_campaigns
    await safeAddIndex('api_campaigns', 'idx_user_created',    '(user_id, created_at)');
    await safeAddIndex('api_campaigns', 'idx_user_status',     '(user_id, status)');
    await safeAddIndex('api_campaigns', 'idx_status_created',  '(status, created_at)');
    await safeAddIndex('api_campaigns', 'idx_created_at',      '(created_at)');
    await safeAddIndex('api_campaigns', 'idx_channel_created', '(channel, created_at)');

    // campaign_queue - heavily used in runQueue and auto-complete
    await safeAddIndex('campaign_queue', 'idx_campaign_status',       '(campaign_id, status)');
    await safeAddIndex('campaign_queue', 'idx_status_updated',        '(status, updated_at)');
    await safeAddIndex('campaign_queue', 'idx_campaign_id',           '(campaign_id)');
    await safeAddIndex('campaign_queue', 'idx_status',                '(status)');

    // api_campaign_queue
    await safeAddIndex('api_campaign_queue', 'idx_campaign_status',   '(campaign_id, status)');
    await safeAddIndex('api_campaign_queue', 'idx_status_updated',    '(status, updated_at)');
    await safeAddIndex('api_campaign_queue', 'idx_campaign_id',       '(campaign_id)');
    await safeAddIndex('api_campaign_queue', 'idx_status',            '(status)');

    // message_logs - detail reports, export
    await safeAddIndex('message_logs', 'idx_campaign_id',           '(campaign_id)');
    await safeAddIndex('message_logs', 'idx_user_created',          '(user_id, created_at)');
    await safeAddIndex('message_logs', 'idx_camp_status',           '(campaign_id, status)');
    await safeAddIndex('message_logs', 'idx_created_at',            '(created_at)');
    await safeAddIndex('message_logs', 'idx_user_id',               '(user_id)');

    // api_message_logs
    await safeAddIndex('api_message_logs', 'idx_campaign_id',       '(campaign_id)');
    await safeAddIndex('api_message_logs', 'idx_user_created',      '(user_id, send_time)');
    await safeAddIndex('api_message_logs', 'idx_camp_status',       '(campaign_id, status)');
    await safeAddIndex('api_message_logs', 'idx_user_id',           '(user_id)');

    // webhook_logs - incoming messages, chats
    await safeAddIndex('webhook_logs', 'idx_user_type_status', '(user_id, type, status)');
    await safeAddIndex('webhook_logs', 'idx_type_status',      '(type, status)');
    await safeAddIndex('webhook_logs', 'idx_created_at',       '(created_at)');
    await safeAddIndex('webhook_logs', 'idx_campaign_id',      '(campaign_id)');

    // transactions - finance/ledger queries
    await safeAddIndex('transactions', 'idx_user_type_created', '(user_id, type, created_at)');
    await safeAddIndex('transactions', 'idx_type_created',      '(type, created_at)');

    // users
    await safeAddIndex('users', 'idx_role_status',    '(role, status)');
    await safeAddIndex('users', 'idx_reseller_id',    '(reseller_id)');

    console.log('');

    // ── STEP 3: Clean Up Orphaned/Completed Queue Rows ────────────────────────
    console.log('🧹 STEP 3: Cleaning Up Campaign Queue\n');

    // Delete campaign_queue rows for campaigns that are already done
    let [result] = await query(`
        DELETE q FROM campaign_queue q
        JOIN campaigns c ON q.campaign_id = c.id
        WHERE c.status IN ('sent', 'completed', 'failed')
        AND q.status IN ('failed', 'sent', 'pending')
    `).catch(e => { console.log('  ⚠️ queue cleanup:', e.message); return [{ affectedRows: 0 }]; });
    console.log(`  ✅ Deleted ${(result?.affectedRows || 0).toLocaleString()} completed manual campaign_queue rows`);

    [result] = await query(`
        DELETE q FROM api_campaign_queue q
        JOIN api_campaigns c ON q.campaign_id = c.id
        WHERE c.status IN ('sent', 'completed', 'failed')
        AND q.status IN ('failed', 'sent', 'pending')
    `).catch(e => { console.log('  ⚠️ api queue cleanup:', e.message); return [{ affectedRows: 0 }]; });
    console.log(`  ✅ Deleted ${(result?.affectedRows || 0).toLocaleString()} completed API campaign_queue rows`);

    // Delete orphaned queue rows (no parent campaign)
    [result] = await query(`
        DELETE q FROM campaign_queue q
        LEFT JOIN campaigns c ON q.campaign_id = c.id
        WHERE c.id IS NULL
    `).catch(e => { console.log('  ⚠️ orphan cleanup:', e.message); return [{ affectedRows: 0 }]; });
    console.log(`  ✅ Deleted ${(result?.affectedRows || 0).toLocaleString()} orphaned campaign_queue rows`);

    [result] = await query(`
        DELETE q FROM api_campaign_queue q
        LEFT JOIN api_campaigns c ON q.campaign_id = c.id
        WHERE c.id IS NULL
    `).catch(e => { console.log('  ⚠️ orphan cleanup:', e.message); return [{ affectedRows: 0 }]; });
    console.log(`  ✅ Deleted ${(result?.affectedRows || 0).toLocaleString()} orphaned API campaign_queue rows`);

    console.log('');

    // ── STEP 4: ANALYZE tables so MySQL uses new indexes immediately ──────────
    console.log('📈 STEP 4: Analyzing Tables (Forces MySQL to use new indexes)\n');
    const toAnalyze = ['campaigns', 'api_campaigns', 'campaign_queue', 'api_campaign_queue',
                       'message_logs', 'api_message_logs', 'webhook_logs', 'transactions', 'users'];
    for (const t of toAnalyze) {
        try {
            await query(`ANALYZE TABLE ${t}`);
            console.log(`  ✅ ANALYZE ${t}`);
        } catch (e) {
            console.log(`  ⚠️ ANALYZE ${t}: ${e.message}`);
        }
    }
    console.log('');

    // ── STEP 5: Show table sizes AFTER cleanup ────────────────────────────────
    console.log('📊 STEP 5: Table Sizes AFTER Cleanup\n');
    for (const t of ['campaigns', 'api_campaigns', 'campaign_queue', 'api_campaign_queue']) {
        const s = await getTableSize(t);
        const rowStr = Number(s.row_count).toLocaleString();
        console.log(`  ${t.padEnd(25)} rows: ${rowStr.padStart(12)}   size: ${s.size_mb} MB`);
    }
    console.log('');

    // ── STEP 6: Fix any stuck running campaigns ───────────────────────────────
    console.log('🔧 STEP 6: Auto-completing stuck running campaigns\n');
    try {
        const [stuck] = await query(`
            SELECT c.id FROM campaigns c
            WHERE c.status = 'running'
            AND NOT EXISTS (
                SELECT 1 FROM campaign_queue q
                WHERE q.campaign_id = c.id AND q.status IN ('pending', 'processing')
            )
        `);

        for (const camp of stuck) {
            const [dbStats] = await query(`
                SELECT COUNT(*) as total, COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
                FROM message_logs WHERE campaign_id = ?
            `, [camp.id]);
            await query(
                `UPDATE campaigns SET status = 'sent', sent_count = ?, failed_count = ? WHERE id = ?`,
                [dbStats[0]?.total || 0, dbStats[0]?.failed || 0, camp.id]
            );
            console.log(`  ✅ Auto-completed stuck campaign ${camp.id}`);
        }
        if (stuck.length === 0) console.log('  ✅ No stuck campaigns found.');
    } catch (e) {
        console.log('  ⚠️ Stuck campaign fix:', e.message);
    }

    console.log('\n✨ ===== MEGA PERFORMANCE FIX COMPLETE =====');
    console.log('');
    console.log('📌 Next steps on server:');
    console.log('   pm2 reload notifynow-live-prod --update-env');
    console.log('');
    process.exit(0);
}

megaFix().catch(e => {
    console.error('Fatal:', e);
    process.exit(1);
});
