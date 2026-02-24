const mysql = require('mysql2/promise');
require('dotenv').config();

const updateWebhookLogsTable = async () => {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
    });

    try {
        console.log('🔄 Updating webhook_logs table structure...');

        // Drop the old table
        await connection.query('DROP TABLE IF EXISTS webhook_logs');

        // Create the new table matching the Dotgo structure
        const createTableSql = `
      CREATE TABLE webhook_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        received_time VARCHAR(100),
        subscription VARCHAR(100),
        message_data TEXT,
        product VARCHAR(50),
        business_id VARCHAR(100),
        type VARCHAR(50),
        project_number VARCHAR(100),
        event_type VARCHAR(50),
        message_id_envelope VARCHAR(100),
        publish_time VARCHAR(100),
        raw_payload JSON,
        status VARCHAR(50) DEFAULT 'received',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

        await connection.query(createTableSql);

        console.log('✅ webhook_logs table recreated successfully with Dotgo parameters.');

    } catch (error) {
        console.error('❌ Error updating table:', error.message);
    } finally {
        await connection.end();
    }
};

updateWebhookLogsTable();
