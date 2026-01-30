require('dotenv').config();
const mysql = require('mysql2/promise');

async function createRcsTemplateTables() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASS || 'root123',
        database: process.env.DB_NAME || 'cell24x7_db'
    });

    try {
        console.log('Connected to database.');

        // 1. RCS Templates
        await connection.query(`
            CREATE TABLE IF NOT EXISTS rcs_templates (
                id VARCHAR(36) PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                language VARCHAR(50) DEFAULT 'en',
                category VARCHAR(50) DEFAULT 'Marketing',
                status ENUM('draft', 'pending_approval', 'approved', 'rejected') DEFAULT 'pending_approval',
                header_type ENUM('none', 'text', 'image', 'video', 'document') DEFAULT 'none',
                header_content TEXT,
                body TEXT NOT NULL,
                footer TEXT,
                rejection_reason TEXT,
                created_by VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ rcs_templates table created/verified');

        // 2. RCS Template Buttons
        await connection.query(`
            CREATE TABLE IF NOT EXISTS rcs_template_buttons (
                id INT AUTO_INCREMENT PRIMARY KEY,
                template_id VARCHAR(36) NOT NULL,
                type VARCHAR(50) DEFAULT 'action',
                action_type VARCHAR(50),
                display_text VARCHAR(100) NOT NULL,
                uri TEXT,
                position INT DEFAULT 0,
                FOREIGN KEY (template_id) REFERENCES rcs_templates(id) ON DELETE CASCADE
            )
        `);
        console.log('✅ rcs_template_buttons table created/verified');

        // 3. RCS Template Variables
        await connection.query(`
            CREATE TABLE IF NOT EXISTS rcs_template_variables (
                id INT AUTO_INCREMENT PRIMARY KEY,
                template_id VARCHAR(36) NOT NULL,
                name VARCHAR(100) NOT NULL,
                sample_value TEXT,
                FOREIGN KEY (template_id) REFERENCES rcs_templates(id) ON DELETE CASCADE
            )
        `);
        console.log('✅ rcs_template_variables table created/verified');

        // 4. RCS Template Analytics
        await connection.query(`
            CREATE TABLE IF NOT EXISTS rcs_template_analytics (
                id INT AUTO_INCREMENT PRIMARY KEY,
                template_id VARCHAR(36) NOT NULL,
                total_sent INT DEFAULT 0,
                total_read INT DEFAULT 0,
                total_clicked INT DEFAULT 0,
                FOREIGN KEY (template_id) REFERENCES rcs_templates(id) ON DELETE CASCADE
            )
        `);
        console.log('✅ rcs_template_analytics table created/verified');

        // 5. RCS Template Approvals (History)
        await connection.query(`
            CREATE TABLE IF NOT EXISTS rcs_template_approvals (
                id INT AUTO_INCREMENT PRIMARY KEY,
                template_id VARCHAR(36) NOT NULL,
                status ENUM('approved', 'rejected') NOT NULL,
                rejection_reason TEXT,
                approved_by VARCHAR(100),
                rejected_by VARCHAR(100),
                approved_at TIMESTAMP NULL,
                rejected_at TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (template_id) REFERENCES rcs_templates(id) ON DELETE CASCADE
            )
        `);
        console.log('✅ rcs_template_approvals table created/verified');

    } catch (err) {
        console.error('Error creating tables:', err);
    } finally {
        await connection.end();
    }
}

createRcsTemplateTables();
