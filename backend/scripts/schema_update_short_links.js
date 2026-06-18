require('dotenv').config({ path: __dirname + '/../.env' });
const db = require('../config/db');

async function run() {
  try {
    console.log('Creating short_links table...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS short_links (
        id INT AUTO_INCREMENT PRIMARY KEY,
        short_code VARCHAR(50) UNIQUE NOT NULL,
        long_url TEXT NOT NULL,
        campaign_id BIGINT,
        user_id INT,
        msisdn VARCHAR(20) NOT NULL,
        clicks INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_short_code (short_code)
      );
    `);

    console.log('Creating short_link_clicks table...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS short_link_clicks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        short_link_id INT,
        ip_address VARCHAR(50),
        user_agent TEXT,
        clicked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (short_link_id) REFERENCES short_links(id) ON DELETE CASCADE
      );
    `);

    console.log('Adding short_link_enabled to api_campaigns table...');
    try {
      await db.query(`
        ALTER TABLE api_campaigns ADD COLUMN short_link_enabled TINYINT(1) DEFAULT 0;
      `);
      console.log('Added short_link_enabled column.');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('short_link_enabled column already exists.');
      } else {
        throw err;
      }
    }

    console.log('Database schema update complete.');
    process.exit(0);
  } catch (e) {
    console.error('Error updating schema:', e);
    process.exit(1);
  }
}

run();
