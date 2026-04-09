const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

/**
 * PRODUCTION-FIRST .env Loader
 * Always prioritizes .env.production over .env to avoid 'root'@'localhost' dev data.
 */
function loadEnv() {
    console.log(`🌍 Current Mode: ${process.env.NODE_ENV || 'Not Set'}`);
    
    // PRIORITY: Always check .env.production FIRST because we are on a real server
    const envFiles = ['.env.production', '.env'];

    const searchDirs = [
        process.cwd(),
        path.join(process.cwd(), 'backend'),
        path.join(__dirname, '..'), // Parent of scripts (usually /backend)
        path.join(__dirname, '..', '..') // Project Root
    ];

    console.log('🔍 Searching for config files (Priority: .env.production > .env)...');
    let foundPath = null;

    // Outer loop search dirs, inner loop search file types
    for (const dir of searchDirs) {
        for (const file of envFiles) {
            const p = path.join(dir, file);
            if (fs.existsSync(p)) {
                // If we haven't found anything yet, or if we found a .production file, take it!
                if (!foundPath || p.includes('.production')) {
                    foundPath = p;
                    if (p.includes('.production')) break; // Stop immediately if production found
                }
            }
        }
    }

    if (foundPath) {
        dotenv.config({ path: foundPath });
        console.log(`  ✅ SELECTED CONFIG: ${foundPath}`);
    } else {
        console.warn('  ⚠️  WARNING: No config files found. Script will use default localhost/root (may fail).');
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

    console.log(`🚀 Final Connection Details:`);
    console.log(`   Host: ${dbConfig.host}`);
    console.log(`   User: ${dbConfig.user}`);
    console.log(`   DB  : ${dbConfig.database}`);

    if (dbConfig.user === 'root' && (process.cwd().includes('home') || process.cwd().includes('adm'))) {
        console.warn('  ⚠️  ATTENTION: Script is using "root" on a Linux server. This is likely WRONG if your production DB has a specific user.');
    }

    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME,
        });

        console.log('\n🔄 Creating Email channel tables...');

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
        console.log('  ✅ email_configs table ready.');

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
        console.log('  ✅ email_templates table ready.');

        const [rows] = await connection.query(`DESCRIBE users`);
        if (!rows.some(r => r.Field === 'email_config_id')) {
            await connection.query(`ALTER TABLE users ADD COLUMN email_config_id INT DEFAULT NULL AFTER rcs_config_id`);
            console.log('  ✅ User table updated with email_config_id.');
        }

        console.log('\n🌟 SUCCESS: Production Email Infrastructure Deployed!');
        await connection.end();
    } catch (error) {
        console.error('\n❌ DATABASE ERROR:', error.message);
        if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.log('\n💡 TIP: Aapki .env.production file sahi se load nahi ho rahi hai ya usme details galat hain.');
        }
    }
}

createEmailTables();
