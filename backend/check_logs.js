require('dotenv').config();
const { query } = require('./config/db');

async function check() {
    try {
        const campId = 'U2AMV';
        console.log(`Checking logs for campaign: ${campId}`);
        const [logs] = await query('SELECT * FROM message_logs WHERE campaign_id = ?', [campId]);
        console.log(`Found ${logs.length} logs in message_logs.`);
        logs.forEach(l => {
            console.log(`ID: ${l.id}, Recipient: ${l.recipient}, Status: ${l.status}, MsgID: ${l.message_id}`);
        });

        const [apiLogs] = await query('SELECT * FROM api_message_logs WHERE campaign_id = ?', [campId]);
        console.log(`Found ${apiLogs.length} logs in api_message_logs.`);
        
        const [queue] = await query('SELECT * FROM campaign_queue WHERE campaign_id = ?', [campId]);
        console.log(`Found ${queue.length} items in campaign_queue.`);
        queue.forEach(q => {
            console.log(`ID: ${q.id}, Mobile: ${q.mobile}, Status: ${q.status}`);
        });

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        process.exit(0);
    }
}

check();
