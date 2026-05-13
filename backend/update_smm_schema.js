const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { query } = require('./config/db');

async function updateSchema() {
  console.log('🚀 Starting Social Media Marketing Schema Update...');
  try {
    // Add is_smm_enabled column if it doesn't exist
    await query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS is_smm_enabled TINYINT(1) DEFAULT 0 AFTER is_proero_enabled
    `);
    console.log('✅ Column is_smm_enabled added to users table.');

    // Create social_accounts table
    await query(`
      CREATE TABLE IF NOT EXISTS social_accounts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        platform ENUM('facebook', 'instagram', 'linkedin', 'twitter') NOT NULL,
        platform_account_id VARCHAR(255),
        account_name VARCHAR(255),
        access_token TEXT,
        status ENUM('active', 'expired', 'disconnected') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Table social_accounts created.');

    // Create social_posts table
    await query(`
      CREATE TABLE IF NOT EXISTS social_posts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        content TEXT,
        media_url TEXT,
        platforms JSON,
        scheduled_at DATETIME,
        status ENUM('draft', 'scheduled', 'published', 'failed') DEFAULT 'draft',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Table social_posts created.');

    console.log('✨ Schema Update Complete!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Schema Update Failed:', err);
    process.exit(1);
  }
}

updateSchema();
