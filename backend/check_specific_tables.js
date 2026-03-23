require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { query } = require('./config/db');
async function run() {
    const tables = ['campaigns', 'campaign_queue', 'message_logs'];
    for (const table of tables) {
        console.log(`--- Schema for table: ${table} ---`);
        const [rows] = await query(`DESCRIBE ${table}`);
        console.table(rows);
    }
    process.exit(0);
}
run();
