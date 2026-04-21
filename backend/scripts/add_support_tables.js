require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { query } = require('../config/db');

async function migrate() {
    try {
        console.log('🚀 Creating Support System Tables...');

        // 1. Tickets Table
        await query(`
            CREATE TABLE IF NOT EXISTS tickets (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                subject VARCHAR(255) NOT NULL,
                category VARCHAR(100) NOT NULL,
                description TEXT,
                status ENUM('open', 'pending', 'resolved', 'closed') DEFAULT 'open',
                priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
                assigned_to INT DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_user (user_id),
                INDEX idx_status (status),
                INDEX idx_assigned (assigned_to)
            )
        `);
        console.log('✅ Tickets table ready.');

        // 2. Ticket Replies/Messages Table
        await query(`
            CREATE TABLE IF NOT EXISTS ticket_replies (
                id INT AUTO_INCREMENT PRIMARY KEY,
                ticket_id INT NOT NULL,
                user_id INT NOT NULL,
                message TEXT NOT NULL,
                is_admin_reply TINYINT(1) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_ticket (ticket_id),
                FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
            )
        `);
        console.log('✅ Ticket replies table ready.');

        // 3. Ticket Attachments Table
        await query(`
            CREATE TABLE IF NOT EXISTS ticket_attachments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                ticket_id INT NOT NULL,
                reply_id INT DEFAULT NULL,
                file_url VARCHAR(255) NOT NULL,
                file_type VARCHAR(50),
                file_name VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_ticket_attach (ticket_id)
            )
        `);
        console.log('✅ Ticket attachments table ready.');

        console.log('✨ Support System Migration Complete!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration Failed:', err.message);
        process.exit(1);
    }
}

migrate();
