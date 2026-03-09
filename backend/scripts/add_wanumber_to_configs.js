const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { query } = require('../config/db');

const migrate = async () => {
    try {
        console.log('🚀 Updating whatsapp_configs table schema...');

        // Check if wanumber column exists
        const checkColumnSql = `
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'whatsapp_configs' AND COLUMN_NAME = 'wanumber' AND TABLE_SCHEMA = ?
        `;
        const [columns] = await query(checkColumnSql, [process.env.DB_NAME]);

        if (columns.length === 0) {
            console.log('➕ Adding "wanumber" column to "whatsapp_configs" table...');
            await query('ALTER TABLE whatsapp_configs ADD COLUMN wanumber VARCHAR(20) NULL AFTER chatbot_name');
            console.log('✅ Column "wanumber" added.');
        } else {
            console.log('ℹ️ Column "wanumber" already exists.');
        }

        console.log('✨ Schema update completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Schema update failed:', error.message);
        process.exit(1);
    }
};

migrate();
