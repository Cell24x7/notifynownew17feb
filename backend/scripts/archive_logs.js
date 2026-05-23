const path = require('path');
const dotenv = require('dotenv');

// Respect NODE_ENV or default to .env.production
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
dotenv.config({ path: path.join(__dirname, '..', envFile) });

const { query } = require('../config/db');

// Parse command line arguments
const args = process.argv.slice(2);
let retentionDays = 90; // Default 90 days log retention
const daysIndex = args.indexOf('--days');
if (daysIndex !== -1 && args[daysIndex + 1]) {
    retentionDays = parseInt(args[daysIndex + 1], 10) || 90;
}

const batchSize = 5000; // Small batch size to avoid table locking

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function archiveTable(sourceTable, archiveTable, dateColumn = 'created_at') {
    const start = Date.now();
    console.log(`\n📦 Starting archiving for ${sourceTable} to ${archiveTable} (Older than ${retentionDays} days)...`);

    try {
        // 1. Create archive table if it doesn't exist
        await query(`CREATE TABLE IF NOT EXISTS ${archiveTable} LIKE ${sourceTable}`);
        console.log(`   - Archive table verified/created: ${archiveTable}`);

        // Get count of items to archive
        const [countRes] = await query(`
            SELECT COUNT(*) as cnt 
            FROM ${sourceTable} 
            WHERE ${dateColumn} < NOW() - INTERVAL ? DAY
        `, [retentionDays]);
        
        const totalToArchive = countRes[0].cnt;
        console.log(`   - Total items to archive: ${Number(totalToArchive).toLocaleString('en-IN')}`);

        if (totalToArchive === 0) {
            console.log(`   - No items to archive for ${sourceTable}. Skipping.`);
            return;
        }

        let processed = 0;
        
        while (processed < totalToArchive) {
            // Find batch boundary IDs to be completely safe and avoid offset performance degradation
            const [boundaryRes] = await query(`
                SELECT id 
                FROM ${sourceTable} 
                WHERE ${dateColumn} < NOW() - INTERVAL ? DAY 
                ORDER BY id ASC 
                LIMIT ? OFFSET ?
            `, [retentionDays, 1, Math.min(batchSize - 1, totalToArchive - processed - 1)]);

            if (boundaryRes.length === 0) break;
            const maxIdInBatch = boundaryRes[0].id;

            // Copy batch
            const [insertRes] = await query(`
                INSERT INTO ${archiveTable}
                SELECT * FROM ${sourceTable}
                WHERE ${dateColumn} < NOW() - INTERVAL ? DAY AND id <= ?
            `, [retentionDays, maxIdInBatch]);

            const insertedRows = insertRes.affectedRows;

            // Delete batch
            const [deleteRes] = await query(`
                DELETE FROM ${sourceTable}
                WHERE id <= ? AND ${dateColumn} < NOW() - INTERVAL ? DAY
            `, [maxIdInBatch, retentionDays]);

            const deletedRows = deleteRes.affectedRows;

            processed += insertedRows;
            console.log(`   - Batched: Archived ${insertedRows.toLocaleString('en-IN')} / Deleted ${deletedRows.toLocaleString('en-IN')} (Progress: ${processed.toLocaleString('en-IN')}/${totalToArchive.toLocaleString('en-IN')})`);
            
            // Brief sleep to yield CPU and let concurrent worker writes succeed
            await sleep(100);
        }

        const duration = Date.now() - start;
        console.log(`✅ Completed ${sourceTable} archiving. Processed ${processed.toLocaleString('en-IN')} rows in ${Math.round(duration/1000)}s.`);
    } catch (err) {
        console.error(`❌ Error archiving ${sourceTable}:`, err.message);
    }
}

async function runArchiver() {
    console.log('🚀 ========================================================');
    console.log('🚀           SYSTEM LOGS ARCHIVER & CLEANUP ENGINE          ');
    console.log(`🚀           Target Retention Period: ${retentionDays} Days      `);
    console.log('🚀 ========================================================');

    // 1. Archive manual campaign logs
    await archiveTable('message_logs', 'message_logs_archive', 'created_at');

    // 2. Archive api campaign logs
    await archiveTable('api_message_logs', 'api_message_logs_archive', 'send_time');

    // 3. Archive webhook logs
    await archiveTable('webhook_logs', 'webhook_logs_archive', 'created_at');

    // 4. Optimize tables to reclaim disk space (run in background, can take a bit)
    console.log('\n⚡ Reclaiming physical disk space (OPTIMIZE TABLES)...');
    const tablesToOptimize = ['message_logs', 'api_message_logs', 'webhook_logs'];
    for (const table of tablesToOptimize) {
        try {
            console.log(`   - Optimizing table: ${table}...`);
            // OPTIMIZE TABLE locks the table, so run it only if it has been cleared significantly
            await query(`OPTIMIZE TABLE ${table}`);
            console.log(`   - Successfully optimized: ${table}`);
        } catch (optErr) {
            console.log(`   - Optimize note: ${optErr.message} (can be skipped safely)`);
        }
    }

    console.log('\n🎉 ========================================================');
    console.log('🎉       LOGS ARCHIVING AND STORAGE OPTIMIZATION COMPLETE  ');
    console.log('🎉 ========================================================');
    process.exit(0);
}

runArchiver().catch(err => {
    console.error('❌ Archiver Fatal Error:', err.message);
    process.exit(1);
});
