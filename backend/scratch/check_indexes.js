const path = require('path');
const dotenv = require('dotenv');

// Load environment config
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
dotenv.config({ path: path.join(__dirname, '..', envFile) });

const { query } = require('../config/db');

async function run() {
    try {
        const tables = ['campaigns', 'api_campaigns', 'transactions', 'webhook_logs', 'message_logs', 'api_message_logs'];
        for (const table of tables) {
            console.log(`\n=== Indexes for table: ${table} ===`);
            try {
                const [indexes] = await query(`SHOW INDEX FROM \`${table}\``);
                indexes.forEach(idx => {
                    console.log(`- IndexName: ${idx.Key_name}, Column: ${idx.Column_name}, NonUnique: ${idx.Non_unique}`);
                });
            } catch (err) {
                console.error(`Error fetching indexes for ${table}:`, err.message);
            }
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();
