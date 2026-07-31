require('dotenv').config();
const { query } = require('./config/db');

async function run() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS voice_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        campaign_id VARCHAR(255) NOT NULL,
        campaign_name VARCHAR(255),
        mobile VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL,
        duration INT DEFAULT 0,
        attempts INT DEFAULT 1,
        message_id VARCHAR(255) UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX (user_id),
        INDEX (campaign_id),
        INDEX (mobile)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("Table voice_logs created successfully!");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
