const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

/**
 * Super Robust .env Loader
 * Prioritizes .env.production if NODE_ENV=production
 */
function loadEnv() {
    console.log(`🌍 NODE_ENV: ${process.env.NODE_ENV || 'not set (defaulting to production logic)'}`);
    
    // Check both .env and .env.production
    const envFiles = [
        process.env.NODE_ENV === 'production' ? '.env.production' : '.env',
        '.env.production', // Fallback to production if first fails
        '.env'
    ];

    const searchDirs = [
        process.cwd(),
        path.join(process.cwd(), 'backend'),
        path.join(__dirname, '..'),
        path.join(__dirname, '..', '..')
    ];

    console.log('🔍 Searching for environment files...');
    let found = false;

    for (const dir of searchDirs) {
        for (const file of envFiles) {
            const p = path.join(dir, file);
            if (fs.existsSync(p)) {
                dotenv.config({ path: p });
                console.log(`  ✅ Successfully loaded CONFIG from: ${p}`);
                found = true;
                break;
            }
        }
        if (found) break;
    }

    if (!found) {
        console.warn('  ⚠️  WARNING: Could not find .env or .env.production. Is it in the root or /backend folder?');
    }
}

async function createEmailTables() {
    loadEnv();

    const dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASS ? '********' : '(no password)',
        database: process.env.DB_NAME || 'notifynow_db'
    };

    console.log(`🚀 Connection Details:`);
    console.log(`   Host: ${dbConfig.host}`);
    console.log(`   User: ${dbConfig.user}`);
    console.log(`   DB  : ${dbConfig.database}`);

    if (!process.env.DB_USER) {
        console.error('❌ FATAL ERROR: DB_USER is missing. Credentials not loaded correctly.');
        process.exit(1);
    }

    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
    });

    try {
        console.log('\n🔄 Creating Email tables...');

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
        console.log('  ✅ email_configs ready.');

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
        console.log('  ✅ email_templates ready.');

        // 3. Add email_config_id column to users
        const [rows] = await connection.query(`DESCRIBE users`);
        if (!rows.some(r => r.Field === 'email_config_id')) {
            await connection.query(`ALTER TABLE users ADD COLUMN email_config_id INT DEFAULT NULL AFTER rcs_config_id`);
            console.log('  ✅ email_config_id column added to users table.');
        }

        console.log('\n✨ MISSION SUCCESS: Email channel infrastructure is fully deployed!');
    } catch (error) {
        console.error('\n❌ DATABASE ERROR:', error.message);
    } finally {
        await connection.end();
    }
}

createEmailTables();
