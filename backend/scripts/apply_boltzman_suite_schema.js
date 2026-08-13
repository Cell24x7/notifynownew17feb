const { query } = require('../config/db');

async function applySchema() {
  console.log('🚀 Applying Schema Updates for Boltzman Advanced Reseller Suite...');
  try {
    // 1. Add new columns to users table safely
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS sender_type ENUM('static', 'dynamic') DEFAULT 'dynamic'`).catch(e => console.log('sender_type:', e.message));
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS account_expiry_date DATETIME DEFAULT NULL`).catch(e => console.log('account_expiry_date:', e.message));
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS billing_type ENUM('prepaid', 'postpaid') DEFAULT 'prepaid'`).catch(e => console.log('billing_type:', e.message));
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS postpaid_credit_limit DECIMAL(12,2) DEFAULT 0.00`).catch(e => console.log('postpaid_credit_limit:', e.message));
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_advanced_reseller_suite TINYINT(1) DEFAULT 0`).catch(e => console.log('is_advanced_reseller_suite:', e.message));

    // 2. Enable Advanced Suite for Boltzman (ID: 56 / boltzamn@gmail.com)
    await query(`UPDATE users SET is_advanced_reseller_suite = 1 WHERE id = 56 OR email = 'boltzamn@gmail.com'`);
    console.log('✅ Enabled is_advanced_reseller_suite for Boltzman (ID 56)');

    // 3. Create user_sender_mappings table
    await query(`
      CREATE TABLE IF NOT EXISTS user_sender_mappings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        sender_id VARCHAR(20) NOT NULL,
        pe_id VARCHAR(50) DEFAULT NULL,
        status ENUM('active', 'inactive', 'pending') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY idx_user_sender (user_id, sender_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('✅ Table user_sender_mappings verified/created');

    console.log('🎉 Schema migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration Error:', error.message);
    process.exit(1);
  }
}

applySchema();
