const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { query } = require('../config/db');

const migrate = async () => {
    try {
        console.log('🚀 Updating whatsapp_configs table for Vendor 1 & Vendor 2...');

        // 1. Add api_key column if it doesn't exist
        const checkColumnSql = `
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'whatsapp_configs' AND COLUMN_NAME = 'api_key' AND TABLE_SCHEMA = ?
        `;
        const [columns] = await query(checkColumnSql, [process.env.DB_NAME]);

        if (columns.length === 0) {
            console.log('➕ Adding "api_key" column...');
            await query('ALTER TABLE whatsapp_configs ADD COLUMN api_key TEXT NULL AFTER wa_token');
            console.log('✅ Column "api_key" added.');
        } else {
            console.log('ℹ️ Column "api_key" already exists.');
        }

        // 2. Migrate existing provider names
        console.log('🔄 Migrating provider names (facebook -> vendor1, pinnacle -> vendor2)...');
        await query("UPDATE whatsapp_configs SET provider = 'vendor1' WHERE provider = 'facebook'");
        await query("UPDATE whatsapp_configs SET provider = 'vendor2' WHERE provider = 'pinnacle'");
        console.log('✅ Provider names migrated.');

        console.log('✨ Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
};

migrate();
