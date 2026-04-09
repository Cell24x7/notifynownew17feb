const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

/**
 * Super Robust .env Loader
 * Checks current dir, parent dir, and /backend dir
 */
function loadEnv() {
    const possiblePaths = [
        path.join(process.cwd(), '.env'),
        path.join(process.cwd(), '..', '.env'),
        path.join(process.cwd(), 'backend', '.env'),
        path.join(__dirname, '..', '.env'),
        path.join(__dirname, '..', '..', '.env')
    ];

    console.log('🔍 Searching for .env file...');
    let found = false;

    for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
            dotenv.config({ path: p });
            console.log(`  ✅ Found .env at: ${p}`);
            found = true;
            break;
        }
    }

    if (!found) {
        console.error('  ⚠️  WARNING: No .env file found in any expected location.');
    }
}

async function createEmailTables() {
    loadEnv();

    // Masked Database Info for Logging
    const dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASS ? '********' : '(no password)',
        database: process.env.DB_NAME || 'notifynow_db'
    };

    console.log(`🚀 Connecting to: ${dbConfig.host} / Database: ${dbConfig.database} as User: ${dbConfig.user}`);

    if (!process.env.DB_USER) {
        console.error('❌ FATAL ERROR: Database credentials (DB_USER) are missing from .env.');
        process.exit(1);
    }

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

        console.log('\n🌟 SUCCESS: All Email channel infrastructure is ready!');
    } catch (error) {
        console.error('❌ DATABASE ERROR:', error.message);
    } finally {
        await connection.end();
    }
}

createEmailTables();
