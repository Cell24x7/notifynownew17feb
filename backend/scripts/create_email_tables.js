const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../.env' });

async function createEmailTables() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
    });

    try {
        console.log('🔄 Creating Email related tables...');

        // 1. email_configs table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS email_configs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                name VARCHAR(100) NOT NULL,
                host VARCHAR(255) NOT NULL,
                port INT NOT NULL,
                secure TINYINT(1) DEFAULT 1,
                user VARCHAR(255) NOT NULL,
                pass VARCHAR(255) NOT NULL,
                from_email VARCHAR(255) NOT NULL,
                from_name VARCHAR(255),
                is_active TINYINT(1) DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_user_active (user_id, is_active)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log('✅ Table email_configs ready.');

        // 2. email_templates table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS email_templates (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                name VARCHAR(255) NOT NULL,
                subject VARCHAR(255) NOT NULL,
                body_html LONGTEXT,
                body_text TEXT,
                design_json JSON,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_user (user_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log('✅ Table email_templates ready.');

        // 3. Add email_config_id to users
        const [cols] = await connection.query('DESCRIBE users');
        const hasEmailId = cols.some(c => c.Field === 'email_config_id');
        if (!hasEmailId) {
            await connection.query('ALTER TABLE users ADD COLUMN email_config_id INT DEFAULT NULL AFTER rcs_config_id');
            console.log('✅ Column email_config_id added to users table.');
        }

        console.log('\n🚀 All Email tables and columns are ready!');
    } catch (error) {
        console.error('❌ Error creating Email tables:', error.message);
    } finally {
        await connection.end();
    }
}

createEmailTables();
