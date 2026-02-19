const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { query } = require('../config/db');

console.log('?? DB Host:', process.env.DB_HOST);
console.log('?? DB User:', process.env.DB_USER);
console.log('?? DB Name:', process.env.DB_NAME);


const createTable = async () => {
    try {
        await query('DROP TABLE IF EXISTS campaign_queue');
        await query(`
            CREATE TABLE campaign_queue (
                id BIGINT AUTO_INCREMENT PRIMARY KEY, 
                campaign_id VARCHAR(255), 
                mobile VARCHAR(20), 
                status ENUM('pending', 'processing', 'sent', 'failed') DEFAULT 'pending', 
                message_id VARCHAR(255), 
                error_message TEXT, 
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_campaign_status (campaign_id, status)
            )
        `);
        console.log('✅ campaign_queue table created successfully');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating table:', error);
        process.exit(1);
    }
};

createTable();

