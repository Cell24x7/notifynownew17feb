const path = require('path');
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
require('dotenv').config({ path: path.join(__dirname, '../', envFile) });
const { query } = require('../config/db');

async function migrate() {
    console.log('--- Adding Failover Lock Column ---');
    try {
        const tables = ['message_logs', 'api_message_logs'];
        
        for (const table of tables) {
            try {
                process.stdout.write(`Updating ${table}... `);
                await query(`ALTER TABLE ${table} 
                    ADD COLUMN IF NOT EXISTS failover_triggered TINYINT(1) DEFAULT 0`);
                console.log('✅ Done');
            } catch (err) {
                console.log(`❌ Failed: ${err.message}`);
            }
        }
        
    } catch (err) {
        console.error('❌ Critical Error:', err.message);
    }
    process.exit();
}

migrate();
