require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.production') });
const { query } = require('../config/db');
const { campaignQueue } = require('../queues/campaignQueue');
const Redis = require('ioredis');
const { redisConnection } = require('../queues/campaignQueue');

async function flush() {
    console.log("🚀 --- STARTING SYSTEM QUEUE FLUSH & RESTORATION ---");
    const redis = new Redis(redisConnection);

    try {
        // 1. Drain BullMQ Queue (Deletes all waiting and active jobs from Redis)
        console.log("📥 Draining BullMQ campaign queue...");
        await campaignQueue.drain(true);
        console.log("✅ BullMQ queue drained successfully.");

        // 2. Clear progress counters in Redis
        console.log("🧹 Clearing campaign progress/stats keys in Redis...");
        const envSuffix = (process.env.APP_NAME || 'notifynow').replace(/-developer|-production/g, '');
        const keys = await redis.keys(`${envSuffix}:*`);
        if (keys.length > 0) {
            console.log(`Deleting ${keys.length} temporary Redis keys...`);
            await redis.del(...keys);
        }
        console.log("✅ Redis counters cleared.");

        // 3. Reset processing/pending states in MySQL
        console.log("🔄 Resetting database message queues...");
        const [res1] = await query(`
            UPDATE campaign_queue 
            SET status = 'pending', worker_id = NULL, updated_at = NOW() 
            WHERE status IN ('processing', 'pending')
        `);
        console.log(`Updated campaign_queue: ${res1.affectedRows} rows reset to 'pending'.`);

        const [res2] = await query(`
            UPDATE api_campaign_queue 
            SET status = 'pending', worker_id = NULL, updated_at = NOW() 
            WHERE status IN ('processing', 'pending')
        `);
        console.log(`Updated api_campaign_queue: ${res2.affectedRows} rows reset to 'pending'.`);

        console.log("🎉 --- SYSTEM FLUSH COMPLETED SUCCESSFULLY ---");
        console.log("System is now completely clean. PM2 will resume sending cleanly.");
    } catch (err) {
        console.error("❌ Flush error:", err);
    } finally {
        redis.disconnect();
        process.exit(0);
    }
}

flush();
