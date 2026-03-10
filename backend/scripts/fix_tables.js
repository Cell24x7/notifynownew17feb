const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { query } = require('../config/db');

const fix = async () => {
    try {
        console.log('🚀 Starting Quick Replies Table Creation...');
        const createSql = `
            CREATE TABLE IF NOT EXISTS quick_replies (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                title VARCHAR(100) NOT NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `;
        await query(createSql);
        console.log('✅ Table "quick_replies" created successfully.');

        // Let's also check and add user_id column to webhook_logs if it's missing (though it seems it's there based on the chats.js)
        // Wait, chats.js uses WHERE user_id = ? on webhook_logs, so it MUST have it.

        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
};

fix();
