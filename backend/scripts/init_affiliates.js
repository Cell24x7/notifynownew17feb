const { query } = require('../config/db');

async function initAffiliatesTable() {
    const createTableQuery = `
    CREATE TABLE IF NOT EXISTS affiliates (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      referral_code VARCHAR(50) NOT NULL UNIQUE,
      signups INT DEFAULT 0,
      active_clients INT DEFAULT 0,
      commission_earned DECIMAL(10, 2) DEFAULT 0.00,
      payout_status ENUM('pending', 'processing', 'paid') DEFAULT 'pending',
      status ENUM('active', 'inactive') DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );
  `;

    try {
        await query(createTableQuery);
        console.log('✅ Affiliates table created or already exists.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating affiliates table:', error);
        process.exit(1);
    }
}

initAffiliatesTable();
