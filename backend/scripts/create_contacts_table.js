const { query } = require('../config/db');

async function createContactsTable() {
    try {
        console.log('Creating contacts table...');

        await query(`
            CREATE TABLE IF NOT EXISTS contacts (
                id VARCHAR(36) PRIMARY KEY,
                user_id INT NOT NULL,
                name VARCHAR(255) NOT NULL,
                phone VARCHAR(50) NOT NULL,
                email VARCHAR(255),
                category ENUM('guest', 'lead', 'customer', 'vip') DEFAULT 'lead',
                channel ENUM('whatsapp', 'email', 'sms', 'instagram', 'web') DEFAULT 'whatsapp',
                labels TEXT,
                starred BOOLEAN DEFAULT FALSE,
                status ENUM('active', 'inactive', 'blocked', 'pending') DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_user_id (user_id),
                INDEX idx_phone (phone),
                INDEX idx_email (email)
            )
        `);

        console.log('✅ Contacts table created successfully.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating contacts table:', error);
        process.exit(1);
    }
}

createContactsTable();
