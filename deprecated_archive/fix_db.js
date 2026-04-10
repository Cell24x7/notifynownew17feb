require('dotenv').config({ path: './backend/.env.production' });
if (!process.env.DB_PASS) require('dotenv').config({ path: './backend/.env' });
const { query } = require('./config/db');

async function fix() {
    try {
        console.log('--- Applying Schema Fixes ---');
        
        // 1. Add api_key to users
        try {
            await query('ALTER TABLE users ADD COLUMN api_key TEXT NULL AFTER api_password');
            console.log('✅ Added api_key to users table');
        } catch (e) {
            if (e.code === 'ER_DUP_COLUMN_NAME') console.log('ℹ️ api_key already exists in users');
            else throw e;
        }

        // 2. Add api_key to whatsapp_configs (if not exists)
        try {
            await query('ALTER TABLE whatsapp_configs ADD COLUMN api_key TEXT NULL AFTER wa_token');
            console.log('✅ Added api_key to whatsapp_configs table');
        } catch (e) {
            if (e.code === 'ER_DUP_COLUMN_NAME') console.log('ℹ️ api_key already exists in whatsapp_configs');
            else throw e;
        }

        // 3. User 36 check
        const [user36] = await query(`
            SELECT u.id, u.email, wc.ph_no_id, wc.provider 
            FROM users u 
            JOIN whatsapp_configs wc ON u.whatsapp_config_id = wc.id 
            WHERE u.id = 36
        `);
        console.log('User 36 Config:', JSON.stringify(user36, null, 2));

        console.log('--- Schema Fixes Done ---');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error applying fixes:', err.message);
        process.exit(1);
    }
}

fix();
