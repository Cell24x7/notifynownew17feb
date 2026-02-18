const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { query } = require('../config/db');

const updateSchema = async () => {
  try {
    console.log('🔄 Starting Schema Update for RCS Reporting...');

    // 1. Create message_logs table
    console.log('1️⃣ Creating message_logs table...');
    await query(`
      CREATE TABLE IF NOT EXISTS message_logs (
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
    console.log('✅ message_logs table created/verified.');

    // 2. Add columns to campaigns table
    console.log('2️⃣ Checking/Adding columns to campaigns table...');

    // Check if delivered_count exists
    const [deliveredCols] = await query(`SHOW COLUMNS FROM campaigns LIKE 'delivered_count'`);
    if (deliveredCols.length === 0) {
      await query(`ALTER TABLE campaigns ADD COLUMN delivered_count INT DEFAULT 0`);
      console.log('✅ Added delivered_count to campaigns table.');
    } else {
      console.log('ℹ️ Column delivered_count already exists.');
    }

    // Check if read_count exists
    const [readCols] = await query(`SHOW COLUMNS FROM campaigns LIKE 'read_count'`);
    if (readCols.length === 0) {
      await query(`ALTER TABLE campaigns ADD COLUMN read_count INT DEFAULT 0`);
      console.log('✅ Added read_count to campaigns table.');
    } else {
      console.log('ℹ️ Column read_count already exists.');
    }

    console.log('🎉 Schema update completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Schema update failed:', error);
    process.exit(1);
  }
};

updateSchema();
