const fs = require('fs');
const path = require('path');

// Safe environment loading
const envPath = fs.existsSync(path.join(__dirname, '../.env.production')) 
    ? path.join(__dirname, '../.env.production') 
    : path.join(__dirname, '../.env');

require('dotenv').config({ path: envPath });
const { query } = require('../config/db');

async function fix() {
    console.log('--- FORCING DATABASE TABLE UPDATE ---');
    try {
        // Force add columns to message_templates
        console.log('Syncing message_templates columns...');
        await query('ALTER TABLE message_templates ADD COLUMN rcs_config_id INT DEFAULT NULL AFTER user_id').catch(err => {
             console.log('ℹ️ rcs_config_id: ' + (err.code === 'ER_DUP_FIELDNAME' ? 'Already exists' : err.message));
        });
        await query('ALTER TABLE message_templates ADD COLUMN whatsapp_config_id INT DEFAULT NULL AFTER user_id').catch(err => {
             console.log('ℹ️ whatsapp_config_id: ' + (err.code === 'ER_DUP_FIELDNAME' ? 'Already exists' : err.message));
        });

        console.log('✅ message_templates table is now ready.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Fix failed:', err.message);
        process.exit(1);
    }
}

fix();
