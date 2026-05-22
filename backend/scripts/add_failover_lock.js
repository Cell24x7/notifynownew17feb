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
                const [existingCols] = await query(`DESCRIBE ${table}`);
                const hasCol = existingCols.some(c => c.Field === 'failover_triggered');
                if (hasCol) {
                    console.log(`⚡ ${table}.failover_triggered already exists. Skipping.`);
                    continue;
                }
                process.stdout.write(`Updating ${table}... `);
                await query(`ALTER TABLE ${table} 
                    ADD COLUMN failover_triggered TINYINT(1) DEFAULT 0`);
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
