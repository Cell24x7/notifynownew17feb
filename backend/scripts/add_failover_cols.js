const path = require('path');
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
require('dotenv').config({ path: path.join(__dirname, '../', envFile) });
const { query } = require('../config/db');

async function migrate() {
    console.log('--- Starting Failover Columns Migration ---');
    try {
        const tables = ['campaigns', 'api_campaigns', 'message_logs', 'api_message_logs'];
        
        for (const table of tables) {
            try {
                const [existingCols] = await query(`DESCRIBE ${table}`);
                const hasCol1 = existingCols.some(c => c.Field === 'is_failover_enabled');
                const hasCol2 = existingCols.some(c => c.Field === 'failover_sms_template');
                
                if (hasCol1 && hasCol2) {
                    console.log(`⚡ ${table} already has both failover columns. Skipping.`);
                    continue;
                }

                process.stdout.write(`Updating ${table}... `);
                let additions = [];
                if (!hasCol1) {
                    additions.push(`ADD COLUMN is_failover_enabled TINYINT(1) DEFAULT 0`);
                }
                if (!hasCol2) {
                    additions.push(`ADD COLUMN failover_sms_template VARCHAR(255) DEFAULT NULL`);
                }

                await query(`ALTER TABLE ${table} ${additions.join(', ')}`);
                console.log('✅ Done');
            } catch (err) {
                if (err.code === 'ER_BAD_TABLE_ERROR') {
                    console.log('⚠️ Skipping (Table doesn\'t exist)');
                } else {
                    console.log(`❌ Failed: ${err.message}`);
                }
            }
        }
        
        console.log('--- Migration Finished ---');
    } catch (err) {
        console.error('❌ Critical Error:', err.message);
    }
    process.exit();
}

migrate();
