const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const mysql = require('mysql2/promise');

(async () => {
  let connection;
  try {
    let connectionOptions = {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || '',
      database: process.env.DB_NAME || 'notifynow_db'
    };

    try {
      connection = await mysql.createConnection(connectionOptions);
    } catch (connErr) {
      connectionOptions.password = 'root123';
      connection = await mysql.createConnection(connectionOptions);
    }

    console.log("✅ Connected to local DB!");

    console.log("Dropping api_message_logs...");
    try {
      await connection.query('DROP TABLE IF EXISTS api_message_logs');
      console.log("✅ Dropped api_message_logs");
    } catch (err) {
      console.error("Failed to drop api_message_logs:", err.message);
    }

    console.log("Dropping message_logs...");
    try {
      await connection.query('DROP TABLE IF EXISTS message_logs');
      console.log("✅ Dropped message_logs");
    } catch (err) {
      console.error("Failed to drop message_logs:", err.message);
    }

    console.log("Re-creating baseline message_logs...");
    await connection.query(`
      CREATE TABLE message_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        campaign_id VARCHAR(255),
        message_id VARCHAR(255),
        recipient VARCHAR(20),
        status VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_campaign_id (campaign_id),
        INDEX idx_message_id (message_id)
      )
    `);
    console.log("✅ Re-created message_logs");

    console.log("Re-creating baseline api_message_logs...");
    await connection.query(`
      CREATE TABLE api_message_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        campaign_id VARCHAR(100),
        campaign_name VARCHAR(255),
        template_name VARCHAR(255),
        message_id VARCHAR(255),
        recipient VARCHAR(20) NOT NULL,
        status VARCHAR(50),
        send_time TIMESTAMP NULL,
        delivery_time TIMESTAMP NULL,
        read_time TIMESTAMP NULL,
        failure_reason TEXT,
        channel VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_campaign (campaign_id),
        INDEX idx_recipient (recipient),
        INDEX idx_message (message_id)
      )
    `);
    console.log("✅ Re-created api_message_logs");

  } catch (err) {
    console.error('Error:', err);
  } finally {
    if (connection) await connection.end();
    process.exit(0);
  }
})();
