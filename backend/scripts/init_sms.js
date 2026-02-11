require('dotenv').config();
const mysql = require('mysql2/promise');

async function createSmsTables() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASS || 'root123',
        database: process.env.DB_NAME || 'cell24x7_db'
    });

    try {
        console.log('Connected to database.');

        // SMS Channels Table
        await connection.query(`
      CREATE TABLE IF NOT EXISTS sms_channels (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        channel_name VARCHAR(100) NOT NULL,
        default_sender_id VARCHAR(20) NOT NULL,
        country VARCHAR(10),
        timezone VARCHAR(50),
        
        api_base_url VARCHAR(255) NOT NULL,
        api_key VARCHAR(255) NOT NULL,
        api_secret VARCHAR(255),
        auth_type VARCHAR(50) NOT NULL,
        
        message_type ENUM('gsm', 'unicode') DEFAULT 'gsm',
        enable_long_sms BOOLEAN DEFAULT 1,
        auto_trim BOOLEAN DEFAULT 0,
        
        cost_per_sms DECIMAL(10, 4) DEFAULT 0.05,
        credit_deduction_mode ENUM('per_sms', 'per_segment') DEFAULT 'per_sms',
        initial_credit_limit DECIMAL(10, 2) DEFAULT 1000.00,
        
        opt_in_required BOOLEAN DEFAULT 1,
        opt_out_keyword VARCHAR(20) DEFAULT 'STOP',
        quiet_hours_start VARCHAR(10),
        quiet_hours_end VARCHAR(10),
        
        status ENUM('active', 'inactive', 'pending') DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
        console.log('✅ sms_channels table created/verified');

    } catch (err) {
        console.error('Error creating tables:', err);
    } finally {
        await connection.end();
    }
}

createSmsTables();
