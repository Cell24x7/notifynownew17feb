require('dotenv').config();
const { query } = require('../config/db');

const migrate = async () => {
    try {
        console.log('🚀 Starting RCS Configuration Migration...');

        // 1. Create rcs_configs table
        const createTableSql = `
            CREATE TABLE IF NOT EXISTS rcs_configs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                auth_url VARCHAR(255) NOT NULL,
                api_base_url VARCHAR(255) NOT NULL,
                client_id VARCHAR(255) NOT NULL,
                client_secret VARCHAR(255) NOT NULL,
                bot_id VARCHAR(255) NOT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `;
        await query(createTableSql);
        console.log('✅ Table "rcs_configs" created or already exists.');

        // 2. Add rcs_config_id to users table
        const checkColumnSql = `
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'rcs_config_id' AND TABLE_SCHEMA = ?
        `;
        const [columns] = await query(checkColumnSql, [process.env.DB_NAME]);

        if (columns.length === 0) {
            console.log('➕ Adding "rcs_config_id" column to "users" table...');
            await query('ALTER TABLE users ADD COLUMN rcs_config_id INT NULL');
            await query('ALTER TABLE users ADD CONSTRAINT fk_rcs_config FOREIGN KEY (rcs_config_id) REFERENCES rcs_configs(id) ON DELETE SET NULL');
            console.log('✅ Column "rcs_config_id" and foreign key added to "users".');
        } else {
            console.log('ℹ️ Column "rcs_config_id" already exists in "users".');
        }

        console.log('✨ Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
};

migrate();
