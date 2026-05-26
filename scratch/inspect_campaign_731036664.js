require('dotenv').config({ path: require('path').resolve(__dirname, '../backend/.env') });
const { query } = require('../backend/config/db');

async function inspect() {
    try {
        console.log('🔍 Querying api_message_logs for campaign 731036664...');
        const [logs] = await query('SELECT * FROM api_message_logs WHERE campaign_id = "731036664" LIMIT 5');
        console.log('Sample logs:', logs);

        const [counts] = await query('SELECT status, COUNT(*) as count FROM api_message_logs WHERE campaign_id = "731036664" GROUP BY status');
        console.log('Counts in api_message_logs:', counts);

        const [queue] = await query('SELECT status, COUNT(*) as count FROM api_campaign_queue WHERE campaign_id = "731036664" GROUP BY status');
        console.log('Counts in api_campaign_queue:', queue);

        process.exit(0);
    } catch (err) {
        console.error('Error:', err.stack);
        process.exit(1);
    }
}

inspect();
