require('dotenv').config({ path: require('path').resolve(__dirname, '../backend/.env.production') });
const { query } = require('../backend/config/db');

async function inspect() {
    try {
        console.log('🔍 Querying campaigns in DB...');
        const [camps] = await query('SELECT id, name, recipient_count, sent_count, delivered_count, read_count, failed_count, status FROM campaigns WHERE name LIKE "%Y9MMR%" OR name LIKE "%7J18B%"');
        console.log('Campaigns found:', camps);

        for (const camp of camps) {
            console.log(`\n-------------------------------------`);
            console.log(`Campaign: ${camp.name} (ID: ${camp.id})`);
            console.log(`Recipient Count: ${camp.recipient_count}`);
            console.log(`Stats in Campaign Table -> Sent: ${camp.sent_count}, Delivered: ${camp.delivered_count}, Read: ${camp.read_count}, Failed: ${camp.failed_count}`);

            // Count total logs
            const [logsCount] = await query('SELECT COUNT(*) as total FROM message_logs WHERE campaign_id = ?', [camp.id]);
            console.log(`Total rows in message_logs: ${logsCount[0].total}`);

            // Count distinct recipients
            const [uniqRecip] = await query('SELECT COUNT(DISTINCT recipient) as count FROM message_logs WHERE campaign_id = ?', [camp.id]);
            console.log(`Unique recipients in message_logs: ${uniqRecip[0].count}`);

            // Group by status
            const [statusGroups] = await query('SELECT status, COUNT(*) as count, COUNT(DISTINCT recipient) as uniq_count FROM message_logs WHERE campaign_id = ? GROUP BY status', [camp.id]);
            console.log(`Logs Grouped by status:`, statusGroups);

            // Group by recipient having > 1 log
            const [duplicates] = await query('SELECT recipient, COUNT(*) as count FROM message_logs WHERE campaign_id = ? GROUP BY recipient HAVING count > 1 LIMIT 5', [camp.id]);
            console.log(`Duplicates sample (recipient, count):`, duplicates);
        }

        process.exit(0);
    } catch (err) {
        console.error('Error:', err.stack);
        process.exit(1);
    }
}

inspect();
