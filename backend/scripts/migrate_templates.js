const fs = require('fs');
const path = require('path');

// Safe environment loading
const envPath = fs.existsSync(path.join(__dirname, '../.env.production')) 
    ? path.join(__dirname, '../.env.production') 
    : path.join(__dirname, '../.env');

require('dotenv').config({ path: envPath });
const { query } = require('../config/db');

async function migrate() {
    console.log('--- Migrating message_templates table ---');
    try {
        // Add rcs_config_id
        await query('ALTER TABLE message_templates ADD COLUMN rcs_config_id INT DEFAULT NULL AFTER user_id').catch(err => {
            if (err.code === 'ER_DUP_FIELDNAME') console.log('ℹ️ rcs_config_id already exists');
            else throw err;
        });

        // Add whatsapp_config_id
        await query('ALTER TABLE message_templates ADD COLUMN whatsapp_config_id INT DEFAULT NULL AFTER user_id').catch(err => {
            if (err.code === 'ER_DUP_FIELDNAME') console.log('ℹ️ whatsapp_config_id already exists');
            else throw err;
        });

        console.log('✅ Migration successful');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        process.exit(1);
    }
}

migrate();
