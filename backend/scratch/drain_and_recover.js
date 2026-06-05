/**
 * drain_and_recover.js
 * Run ONCE on server to reset stuck 'processing' items back to 'pending'
 * Usage: node backend/scratch/drain_and_recover.js
 */

const path = require('path');

// Load .env from project root (works from any subdirectory)
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// Fallback: try parent directories
if (!process.env.DB_HOST) {
    require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
}
if (!process.env.DB_HOST) {
    require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });
}

if (!process.env.DB_HOST) {
    console.error('❌ Could not load .env — DB_HOST missing');
    console.error('   Run from project root: node backend/scratch/drain_and_recover.js');
    process.exit(1);
}

console.log(`✅ DB Config loaded: ${process.env.DB_USER}@${process.env.DB_HOST}/${process.env.DB_NAME}`);

const mysql = require('mysql2/promise');

async function drainAndRecover() {
    console.log(`\n🔧 Drain & Recover Tool`);

    const conn = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
    });

    // 1. Show pending counts per running campaign BEFORE reset
    const [before] = await conn.query(`
        SELECT c.name, c.status as camp_status,
               SUM(q.status = 'pending') as pending,
               SUM(q.status = 'processing') as stuck_processing
        FROM campaign_queue q
        JOIN campaigns c ON q.campaign_id = c.id
        WHERE c.status = 'running'
        GROUP BY q.campaign_id, c.name, c.status
        ORDER BY stuck_processing DESC
    `);

    console.log(`\n📋 BEFORE reset — Running campaigns:`);
    before.forEach(r => {
        console.log(`   ${r.name}: ${(r.pending||0).toLocaleString()} pending, ${(r.stuck_processing||0).toLocaleString()} stuck-processing`);
    });

    // 2. Reset ALL stuck 'processing' items to 'pending'
    const [res1] = await conn.query(`
        UPDATE campaign_queue 
        SET status = 'pending', worker_id = NULL, updated_at = NOW()
        WHERE status = 'processing'
    `);
    console.log(`\n✅ Reset ${res1.affectedRows} campaign_queue items: processing → pending`);

    const [res2] = await conn.query(`
        UPDATE api_campaign_queue 
        SET status = 'pending', worker_id = NULL, updated_at = NOW()
        WHERE status = 'processing'
    `);
    console.log(`✅ Reset ${res2.affectedRows} api_campaign_queue items: processing → pending`);

    // 3. Show AFTER counts
    const [after] = await conn.query(`
        SELECT c.name, COUNT(q.id) as pending_count
        FROM campaign_queue q
        JOIN campaigns c ON q.campaign_id = c.id
        WHERE q.status = 'pending' AND c.status = 'running'
        GROUP BY q.campaign_id, c.name
        ORDER BY pending_count DESC
    `);

    console.log(`\n📋 AFTER reset — Pending items per running campaign:`);
    after.forEach(r => {
        console.log(`   ${r.name}: ${Number(r.pending_count).toLocaleString()} pending`);
    });

    console.log(`\n🚀 Done! processBatch will now pick up ALL campaigns fairly.`);
    console.log(`   Watch the dashboard — all campaigns should start moving in ~30 seconds.\n`);

    await conn.end();
    process.exit(0);
}

drainAndRecover().catch(e => {
    console.error('❌ Error:', e.message);
    process.exit(1);
});
