require('dotenv').config({ path: require('path').resolve(__dirname, '.env.production') });
const { query } = require('./config/db');

async function check() {
    try {
        console.log('====================================================');
        console.log('🔍 SYSTEM DIAGNOSTICS');
        console.log('====================================================');
        
        // 1. Check Times
        const [timeRows] = await query('SELECT NOW() as db_now, UTC_TIMESTAMP() as db_utc, @@global.time_zone as global_tz, @@session.time_zone as session_tz');
        console.log('Database NOW():        ', timeRows[0].db_now);
        console.log('Database UTC:          ', timeRows[0].db_utc);
        console.log('Global Time Zone:      ', timeRows[0].global_tz);
        console.log('Session Time Zone:     ', timeRows[0].session_tz);
        console.log('Node Server Time:      ', new Date().toString());
        console.log('Node Server UTC Time:  ', new Date().toUTCString());
        
        // 2. Check Campaigns for Today (05 Jun 2026)
        console.log('\n====================================================');
        console.log('📋 CAMPAIGNS TODAY (05 JUN 2026)');
        console.log('====================================================');
        const [campaigns] = await query(`
            SELECT id, name, status, scheduled_at, next_run_at, recipient_count, sent_count, failed_count, channel 
            FROM campaigns 
            WHERE name LIKE '%05 Jun 2026%' OR status = 'running' OR status = 'scheduled'
            ORDER BY created_at DESC
        `);
        
        if (campaigns.length === 0) {
            console.log('No campaigns found.');
        }
        
        for (const c of campaigns) {
            console.log(`\nCampaign: ${c.name} (${c.id})`);
            console.log(`  Channel:         `, c.channel);
            console.log(`  Status:          `, c.status);
            console.log(`  Scheduled At:    `, c.scheduled_at);
            console.log(`  Next Run At:     `, c.next_run_at);
            console.log(`  Recipient Count: `, c.recipient_count);
            console.log(`  Sent Count:      `, c.sent_count);
            console.log(`  Failed Count:    `, c.failed_count);
            
            // Check queue counts
            const [qPending] = await query('SELECT COUNT(*) as count FROM campaign_queue WHERE campaign_id = ? AND status = "pending"', [c.id]);
            const [qProcessing] = await query('SELECT COUNT(*) as count FROM campaign_queue WHERE campaign_id = ? AND status = "processing"', [c.id]);
            const [qSent] = await query('SELECT COUNT(*) as count FROM campaign_queue WHERE campaign_id = ? AND status = "sent"', [c.id]);
            const [qFailed] = await query('SELECT COUNT(*) as count FROM campaign_queue WHERE campaign_id = ? AND status = "failed"', [c.id]);
            
            console.log(`  Queue Counts in campaign_queue:`);
            console.log(`    Pending:       `, qPending[0].count);
            console.log(`    Processing:    `, qProcessing[0].count);
            console.log(`    Sent:          `, qSent[0].count);
            console.log(`    Failed:        `, qFailed[0].count);
            
            // Check logs count
            const [logsCount] = await query('SELECT COUNT(*) as count FROM message_logs WHERE campaign_id = ?', [c.id]);
            console.log(`  Logs in message_logs:`, logsCount[0].count);
        }

        // 3. Redis Connectivity check
        console.log('\n====================================================');
        console.log('📡 REDIS QUEUE STATE');
        console.log('====================================================');
        const { redisConnection } = require('./queues/campaignQueue');
        const Redis = require('ioredis');
        const redis = new Redis({ ...redisConnection, maxRetriesPerRequest: 0 });
        try {
            const pong = await Promise.race([
                redis.ping(),
                new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 2000))
            ]);
            console.log('Redis Ping Response:  ', pong);
            console.log('Redis Connection:     SUCCESS');
            
            // Check active jobs in BullMQ
            const envSuffix = (process.env.APP_NAME || 'notifynow').replace(/-developer|-production/g, '');
            const queueKey = `bull:campaign-sending-${envSuffix}`;
            const activeJobs = await redis.llen(`${queueKey}:active`).catch(() => 0);
            const waitJobs = await redis.llen(`${queueKey}:wait`).catch(() => 0);
            console.log('BullMQ Active Jobs:   ', activeJobs);
            console.log('BullMQ Waiting Jobs:  ', waitJobs);
        } catch (e) {
            console.log('Redis Connection:     FAILED -', e.message);
        } finally {
            await redis.quit();
        }

        process.exit(0);
    } catch (err) {
        console.error('Diagnostic error:', err.message);
        process.exit(1);
    }
}

check();
