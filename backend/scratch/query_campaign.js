const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
dotenv.config({ path: path.join(__dirname, '..', envFile) });

const { query } = require('../config/db');

async function check() {
    try {
        console.log('🔍 Looking for campaigns containing "7J18B"...');
        const [camps] = await query('SELECT * FROM campaigns WHERE name LIKE "%7J18B%" OR id LIKE "%7J18B%"');
        if (camps.length === 0) {
            console.log('❌ Campaign not found.');
            process.exit(0);
        }

        for (const camp of camps) {
            console.log('\n==========================================');
            console.log(`Campaign ID: ${camp.id}`);
            console.log(`Campaign Name: ${camp.name}`);
            console.log(`Status: ${camp.status}`);
            console.log(`Total Recipients: ${camp.recipient_count}`);
            console.log(`Sent Count (Table): ${camp.sent_count}`);
            console.log(`Delivered Count (Table): ${camp.delivered_count}`);
            console.log(`Read Count (Table): ${camp.read_count}`);
            console.log(`Failed Count (Table): ${camp.failed_count}`);
            console.log('==========================================');

            // Count queue status
            const [queueStats] = await query('SELECT status, COUNT(*) as count FROM campaign_queue WHERE campaign_id = ? GROUP BY status', [camp.id]);
            console.log('\n📦 campaign_queue status breakdown:');
            queueStats.forEach(row => {
                console.log(`- ${row.status}: ${row.count}`);
            });

            // Count logs status
            const [logStats] = await query('SELECT status, COUNT(*) as count FROM message_logs WHERE campaign_id = ? GROUP BY status', [camp.id]);
            console.log('\n📄 message_logs status breakdown:');
            logStats.forEach(row => {
                console.log(`- ${row.status}: ${row.count}`);
            });

            // Count unique recipient status
            const [uniqStats] = await query(`
                SELECT best_status, COUNT(*) as count FROM (
                    SELECT recipient,
                           MAX(CASE 
                               WHEN status IN ('read', 'displayed', 'read_receipt') THEN 3
                               WHEN status = 'delivered' THEN 2
                               WHEN status IN ('sent', 'submitted', 'success') THEN 1
                               ELSE 0
                           END) as best_weight,
                           CASE MAX(CASE 
                               WHEN status IN ('read', 'displayed', 'read_receipt') THEN 3
                               WHEN status = 'delivered' THEN 2
                               WHEN status IN ('sent', 'submitted', 'success') THEN 1
                               ELSE 0
                           END)
                               WHEN 3 THEN 'read'
                               WHEN 2 THEN 'delivered'
                               WHEN 1 THEN 'sent'
                               ELSE 'failed'
                           END as best_status
                    FROM message_logs
                    WHERE campaign_id = ?
                    GROUP BY recipient
                ) t GROUP BY best_status
            `, [camp.id]);
            console.log('\n📊 Unique recipient best status breakdown:');
            uniqStats.forEach(row => {
                console.log(`- ${row.best_status}: ${row.count}`);
            });
        }
        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

check();
