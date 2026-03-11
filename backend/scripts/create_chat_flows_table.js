require('dotenv').config();
const { query } = require('./config/db');

async function createChatFlowsTable() {
    try {
        console.log('⏳ Creating chat_flows table...');

        await query(`
            CREATE TABLE IF NOT EXISTS chat_flows (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                name VARCHAR(255) NOT NULL,
                category VARCHAR(100),
                keywords JSON,
                header_type VARCHAR(50),
                header_value TEXT,
                body TEXT,
                track_url VARCHAR(255),
                api_config JSON,
                footer_config JSON,
                logic_config JSON,
                status ENUM('active', 'paused', 'draft') DEFAULT 'active',
                triggers INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        console.log('✅ Table chat_flows created/verified successfully!');
    } catch (err) {
        console.error('❌ Error creating chat_flows table:', err.message);
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

createChatFlowsTable();
