const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { query } = require('../config/db');

const migrate = async () => {
    try {
        console.log('🚀 Starting WhatsApp Configuration Migration...');

        // 1. Create whatsapp_configs table
        // Based on fields: ChatbotName, Domain, Customer, WA_Token, PH_No_Id, WA_Biz_Accnt_Id
        const createTableSql = `
            CREATE TABLE IF NOT EXISTS whatsapp_configs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                chatbot_name VARCHAR(100) NOT NULL,
                domain VARCHAR(255),
                customer_id VARCHAR(100),
                wa_token TEXT NOT NULL,
                ph_no_id VARCHAR(255) NOT NULL,
                wa_biz_accnt_id VARCHAR(255) NOT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `;
        await query(createTableSql);
        console.log('✅ Table "whatsapp_configs" created or already exists.');

        // 2. Add whatsapp_config_id to users table
        const checkColumnSql = `
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'whatsapp_config_id' AND TABLE_SCHEMA = ?
        `;
        const [columns] = await query(checkColumnSql, [process.env.DB_NAME]);

        if (columns.length === 0) {
            console.log('➕ Adding "whatsapp_config_id" column to "users" table...');
            await query('ALTER TABLE users ADD COLUMN whatsapp_config_id INT NULL');
            await query('ALTER TABLE users ADD CONSTRAINT fk_whatsapp_config FOREIGN KEY (whatsapp_config_id) REFERENCES whatsapp_configs(id) ON DELETE SET NULL');
            console.log('✅ Column "whatsapp_config_id" and foreign key added to "users".');
        } else {
            console.log('ℹ️ Column "whatsapp_config_id" already exists in "users".');
        }

        console.log('✨ Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
};

migrate();
