const { query } = require('../config/db');

async function ensureEnquiryColumns() {
  try {
    const [columns] = await query('SHOW COLUMNS FROM users');
    const columnNames = columns.map(c => c.Field);

    if (!columnNames.includes('is_read')) {
      console.log('✨ Adding is_read column to users table...');
      await query('ALTER TABLE users ADD COLUMN is_read TINYINT(1) DEFAULT 0');
    }

    if (!columnNames.includes('is_social_signup')) {
      console.log('✨ Adding is_social_signup column to users table...');
      await query('ALTER TABLE users ADD COLUMN is_social_signup TINYINT(1) DEFAULT 0');
    }

    console.log('✅ Users table enquiry columns ready');
  } catch (err) {
    console.error('❌ Failed to update users table:', err.message);
  }
}

module.exports = { ensureEnquiryColumns };
