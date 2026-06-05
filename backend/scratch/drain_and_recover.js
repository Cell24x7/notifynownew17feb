/**
 * drain_and_recover.js
 * Reset stuck 'processing' items back to 'pending' so all campaigns resume
 * Usage: node backend/scratch/drain_and_recover.js
 */

const path = require('path');
const fs = require('fs');

// ecosystem.config.js reads from backend/.env.production
// Try all possible .env file locations
const envPaths = [
    path.resolve(__dirname, '../.env.production'),   // backend/.env.production ← server uses this
    path.resolve(__dirname, '../.env'),              // backend/.env
    path.resolve(__dirname, '../../.env'),           // project root .env
    path.resolve(process.cwd(), 'backend/.env.production'),
    path.resolve(process.cwd(), '.env'),
];

let loaded = false;
for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
        require('dotenv').config({ path: envPath });
        if (process.env.DB_HOST) {
            console.log(`✅ Loaded env from: ${envPath}`);
            loaded = true;
            break;
        }
    }
}

if (!loaded || !process.env.DB_HOST) {
    console.error('❌ Could not find .env with DB_HOST');
    console.error('   Tried:', envPaths.join('\n         '));
    console.error('\n   Tip: Run with manual vars:');
    console.error('   DB_HOST=127.0.0.1 DB_USER=root DB_PASS=xxx DB_NAME=notifynow_db node backend/scratch/drain_and_recover.js');
    process.exit(1);
}

console.log(`   DB: ${process.env.DB_USER}@${process.env.DB_HOST}/${process.env.DB_NAME}`);

const mysql = require('mysql2/promise');

async function drainAndRecover() {
    console.log(`\n🔧 Drain & Recover Tool`);

    const conn = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
    });

    // 1. Show before state
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

    console.log(`\n📋 BEFORE — Running campaigns:`);
    before.forEach(r => {
        console.log(`   ${r.name}: ${Number(r.pending||0).toLocaleString()} pending, ${Number(r.stuck_processing||0).toLocaleString()} stuck`);
    });

    // 2. Reset ALL stuck 'processing' → 'pending'
    const [res1] = await conn.query(`
        UPDATE campaign_queue 
        SET status = 'pending', worker_id = NULL, updated_at = NOW()
        WHERE status = 'processing'
    `);
    console.log(`\n✅ Reset ${res1.affectedRows} items: processing → pending (campaign_queue)`);

    const [res2] = await conn.query(`
        UPDATE api_campaign_queue 
        SET status = 'pending', worker_id = NULL, updated_at = NOW()
        WHERE status = 'processing'
    `);
    console.log(`✅ Reset ${res2.affectedRows} items: processing → pending (api_campaign_queue)`);

    // 3. Show after state
    const [after] = await conn.query(`
        SELECT c.name, COUNT(q.id) as pending_count
        FROM campaign_queue q
        JOIN campaigns c ON q.campaign_id = c.id
        WHERE q.status = 'pending' AND c.status = 'running'
        GROUP BY q.campaign_id, c.name
        ORDER BY pending_count DESC
    `);

    console.log(`\n📋 AFTER — Pending items per running campaign:`);
    after.forEach(r => {
        console.log(`   ${r.name}: ${Number(r.pending_count).toLocaleString()} pending`);
    });

    console.log(`\n🚀 Done! processBatch will pick up ALL campaigns in ~30 seconds.\n`);

    await conn.end();
    process.exit(0);
}

drainAndRecover().catch(e => {
    console.error('❌ Error:', e.message);
    process.exit(1);
});
