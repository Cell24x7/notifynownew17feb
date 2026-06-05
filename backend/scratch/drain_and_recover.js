/**
 * drain_and_recover.js
 * Run ONCE on server to clear BullMQ backlog & reset stuck items
 * Usage: node backend/scratch/drain_and_recover.js
 */

const { Queue } = require('bullmq');
const { query } = require('../config/db');
const Redis = require('ioredis');

require('dotenv').config();

const redisHost = process.env.REDIS_HOST || '127.0.0.1';
const redisPort = parseInt(process.env.REDIS_PORT || '6379');
const redisPass = process.env.REDIS_PASSWORD || undefined;

const connection = { host: redisHost, port: redisPort, password: redisPass };
const envSuffix = (process.env.APP_NAME || 'notifynow').replace(/-developer|-production/g, '');
const queueName = `campaign-sending-${envSuffix}`;

async function drainAndRecover() {
    console.log(`\n🔧 Drain & Recover Tool`);
    console.log(`Queue: ${queueName}`);

    // 1. Drain BullMQ waiting jobs
    const q = new Queue(queueName, { connection });
    const waitingBefore = await q.getWaitingCount();
    console.log(`\n📊 BullMQ waiting jobs BEFORE drain: ${waitingBefore}`);

    if (waitingBefore > 0) {
        await q.drain(); // Remove all waiting (not active) jobs
        console.log(`✅ BullMQ queue drained — ${waitingBefore} waiting jobs removed`);
    } else {
        console.log(`ℹ️  Queue already empty`);
    }

    const waitingAfter = await q.getWaitingCount();
    const activeAfter = await q.getActiveCount();
    console.log(`📊 BullMQ after drain — waiting: ${waitingAfter}, active: ${activeAfter}`);

    // 2. Reset ALL stuck 'processing' items to 'pending'
    const [res1] = await query(`
        UPDATE campaign_queue 
        SET status = 'pending', worker_id = NULL, updated_at = NOW()
        WHERE status = 'processing'
    `);
    console.log(`\n✅ Reset ${res1.affectedRows} campaign_queue items: processing → pending`);

    const [res2] = await query(`
        UPDATE api_campaign_queue 
        SET status = 'pending', worker_id = NULL, updated_at = NOW()
        WHERE status = 'processing'
    `);
    console.log(`✅ Reset ${res2.affectedRows} api_campaign_queue items: processing → pending`);

    // 3. Show pending counts per campaign
    const [pending] = await query(`
        SELECT c.name, c.status as camp_status, COUNT(q.id) as pending_count
        FROM campaign_queue q
        JOIN campaigns c ON q.campaign_id = c.id
        WHERE q.status = 'pending' AND c.status = 'running'
        GROUP BY q.campaign_id, c.name, c.status
        ORDER BY pending_count DESC
    `);

    console.log(`\n📋 Pending items per running campaign:`);
    pending.forEach(r => {
        console.log(`   ${r.name}: ${r.pending_count.toLocaleString()} pending`);
    });

    console.log(`\n🚀 Done! processBatch will now pick up ALL campaigns fairly.`);
    console.log(`   Watch the dashboard — all campaigns should start moving in ~30 seconds.\n`);

    await q.close();
    process.exit(0);
}

drainAndRecover().catch(e => {
    console.error('❌ Error:', e.message);
    process.exit(1);
});
