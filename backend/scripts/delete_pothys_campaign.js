const path = require('path');
const dotenv = require('dotenv');

// Auto-load production or standard .env
dotenv.config({ path: path.join(__dirname, '../.env.production') });
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../../.env') });

const { query } = require('../config/db');
const Redis = require('ioredis');
const { redisConnection } = require('../queues/campaignQueue');

async function deleteSpecificCampaign() {
    const targetQuery = process.argv[2] || 'XJ1KQ';
    console.log(`🔍 Searching for campaigns matching "${targetQuery}"...`);

    try {
        const [camps] = await query('SELECT id, name, user_id, channel, status, created_at FROM campaigns WHERE name LIKE ? OR id = ?', [`%${targetQuery}%`, targetQuery]);
        
        if (!camps.length) {
            console.log(`❌ No campaign found matching "${targetQuery}".`);
            process.exit(0);
        }

        console.log(`Found ${camps.length} campaign(s):`);
        for (const camp of camps) {
            console.log(` - ID: ${camp.id} | Name: ${camp.name} | Channel: ${camp.channel} | Status: ${camp.status} | Created: ${camp.created_at}`);
            
            console.log(`  🗑️ Deleting logs from message_logs...`);
            await query('DELETE FROM message_logs WHERE campaign_id = ?', [camp.id]);

            console.log(`  🗑️ Deleting logs from webhook_logs...`);
            await query('DELETE FROM webhook_logs WHERE campaign_id = ?', [camp.id]);

            console.log(`  🗑️ Deleting from campaign_queue...`);
            await query('DELETE FROM campaign_queue WHERE campaign_id = ?', [camp.id]);

            try {
                await query('DELETE FROM campaign_recipients WHERE campaign_id = ?', [camp.id]);
            } catch (e) {}

            console.log(`  🗑️ Deleting campaign row from campaigns table...`);
            await query('DELETE FROM campaigns WHERE id = ?', [camp.id]);

            // Redis clean up
            try {
                const redis = new Redis(redisConnection);
                const keys = await redis.keys(`*${camp.id}*`);
                if (keys.length > 0) {
                    await redis.del(...keys);
                    console.log(`  🧹 Cleaned ${keys.length} Redis progress keys.`);
                }
                redis.disconnect();
            } catch (re) {}

            console.log(`✅ Campaign [${camp.name}] (ID: ${camp.id}) completely deleted from DB!`);
        }

        console.log(`\n🎉 All matching campaigns and related logs have been successfully removed.`);
        process.exit(0);
    } catch (err) {
        console.error('❌ Error deleting campaign:', err.message);
        process.exit(1);
    }
}

deleteSpecificCampaign();
