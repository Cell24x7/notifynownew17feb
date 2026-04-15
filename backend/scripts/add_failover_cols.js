require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { query } = require('../config/db');

async function migrate() {
    console.log('--- Starting Failover Columns Migration ---');
    try {
        const tables = ['campaigns', 'api_campaigns', 'message_logs', 'api_message_logs'];
        
        for (const table of tables) {
            try {
                process.stdout.write(`Updating ${table}... `);
                await query(`ALTER TABLE ${table} 
                    ADD COLUMN IF NOT EXISTS is_failover_enabled TINYINT(1) DEFAULT 0,
                    ADD COLUMN IF NOT EXISTS failover_sms_template VARCHAR(255) DEFAULT NULL`);
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
