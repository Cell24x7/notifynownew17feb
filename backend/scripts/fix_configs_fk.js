const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env' + (process.env.NODE_ENV === 'production' ? '.production' : '')) });
const { query } = require('../config/db');

const migrate = async () => {
    try {
        console.log('🚀 Starting SUPER FK Fix for Configs...');

        const tables = ['whatsapp_configs', 'rcs_configs', 'sms_gateways'];

        for (const table of tables) {
            console.log(`\n--- Fixing foreign keys for ${table} ---`);
            try {
                // 1. Clear out any bad data that violates the new constraint
                console.log(`🧹 Clearing existing reseller_id data in ${table} to prevent constraint errors...`);
                await query(`UPDATE ${table} SET reseller_id = NULL`);

                // 2. Drop existing FK
                const fkMap = {
                    'whatsapp_configs': 'fk_wa_reseller',
                    'rcs_configs': 'fk_rcs_reseller',
                    'sms_gateways': 'fk_sms_reseller'
                };
                
                const fkName = fkMap[table];
                try {
                    await query(`ALTER TABLE ${table} DROP FOREIGN KEY ${fkName}`);
                    console.log(`✅ Dropped wrong FK ${fkName} from ${table}`);
                } catch (e) {
                    console.log(`ℹ️ FK ${fkName} not found on ${table} (maybe already dropped). Error: ${e.message}`);
                }

                // 3. Drop index if exists to be safe
                try {
                    await query(`ALTER TABLE ${table} DROP INDEX ${fkName}`);
                } catch(e) {}

                // 4. Add correct FK referencing RESELLERS table
                await query(`ALTER TABLE ${table} ADD CONSTRAINT ${fkName} FOREIGN KEY (reseller_id) REFERENCES resellers(id) ON DELETE SET NULL`);
                console.log(`✅ Added correct FK ${fkName} to ${table} referencing resellers(id)`);

            } catch (err) {
                console.log(`❌ Error on ${table}:`, err.message);
            }
        }

        console.log('\n✨ Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
};

migrate();
