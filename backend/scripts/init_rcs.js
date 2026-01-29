require('dotenv').config();
const mysql = require('mysql2/promise');

async function createRcsTables() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASS || 'root123',
        database: process.env.DB_NAME || 'cell24x7_db'
    });

    try {
        console.log('Connected to database.');

        // 1. RCS Bot Master
        await connection.query(`
      CREATE TABLE IF NOT EXISTS rcs_bot_master (
        id INT AUTO_INCREMENT PRIMARY KEY,
        route_type ENUM('DOMESTIC', 'INTERNATIONAL') DEFAULT 'DOMESTIC',
        bot_type ENUM('DOMESTIC', 'INTERNATIONAL') DEFAULT 'DOMESTIC',
        message_type ENUM('OTP', 'TRANSACTIONAL', 'PROMOTIONAL') DEFAULT 'TRANSACTIONAL',
        billing_category VARCHAR(50),
        
        bot_name VARCHAR(100) NOT NULL,
        brand_name VARCHAR(100) NOT NULL,
        short_description TEXT,
        brand_color VARCHAR(20),
        
        bot_logo_url TEXT,
        banner_image_url TEXT,
        
        terms_url TEXT,
        privacy_url TEXT,
        
        development_platform VARCHAR(50),
        webhook_url TEXT,
        callback_url TEXT,
        languages_supported VARCHAR(100) DEFAULT 'English',
        agree_all_carriers BOOLEAN DEFAULT 0,
        
        status ENUM('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED') DEFAULT 'DRAFT',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
        console.log('✅ rcs_bot_master table created/verified');

        // 2. RCS Bot Contacts (Phones, Emails, Websites)
        await connection.query(`
      CREATE TABLE IF NOT EXISTS rcs_bot_contacts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        bot_id INT NOT NULL,
        contact_type ENUM('PHONE', 'EMAIL', 'WEBSITE') NOT NULL,
        contact_value VARCHAR(255) NOT NULL,
        label VARCHAR(50),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES rcs_bot_master(id) ON DELETE CASCADE
      )
    `);
        console.log('✅ rcs_bot_contacts table created/verified');

        // 3. RCS Bot Media (Screenshots, Videos)
        await connection.query(`
      CREATE TABLE IF NOT EXISTS rcs_bot_media (
        id INT AUTO_INCREMENT PRIMARY KEY,
        bot_id INT NOT NULL,
        media_type ENUM('IMAGE', 'VIDEO') NOT NULL,
        media_url TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES rcs_bot_master(id) ON DELETE CASCADE
      )
    `);
        console.log('✅ rcs_bot_media table created/verified');

    } catch (err) {
        console.error('Error creating tables:', err);
    } finally {
        await connection.end();
    }
}

createRcsTables();
