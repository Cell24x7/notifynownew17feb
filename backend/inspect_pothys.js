const { query } = require('./config/db');
require('dotenv').config();

async function check() {
    try {
        console.log('Querying campaigns for 22 May 2026...');
        const [camps] = await query(`
            SELECT id, name, recipient_count, sent_count, delivered_count, read_count, failed_count
            FROM campaigns
            WHERE name LIKE '%22 May 2026%'
            ORDER BY id DESC
        `);

        for (const camp of camps) {
            console.log(`\n--------------------------------------------`);
            console.log(`Campaign: ${camp.name} (ID: ${camp.id})`);
            console.log(`DB Columns (campaigns table):`);
            console.log(`  Recipient Count (Total):`, camp.recipient_count);
            console.log(`  Sent Count:             `, camp.sent_count);
            console.log(`  Delivered Count:        `, camp.delivered_count);
            console.log(`  Read Count:             `, camp.read_count);
            console.log(`  Failed Count:           `, camp.failed_count);

            const [statusCounts] = await query(`
                SELECT channel, status, COUNT(*) as count 
                FROM message_logs 
                WHERE campaign_id = ? 
                GROUP BY channel, status
            `, [camp.id]);
            
            console.log(`Actual rows in message_logs table:`);
            let logsSum = 0;
            statusCounts.forEach(s => {
                console.log(`  Channel: ${s.channel}, Status: ${s.status} -> Count: ${s.count}`);
                logsSum += s.count;
            });
            console.log(`  Total rows in message_logs:`, logsSum);
        }
        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

check();
