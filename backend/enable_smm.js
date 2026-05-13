const path = require('path');
const fs = require('fs');

// Load environment
const envPath = fs.existsSync(path.join(__dirname, '.env.production')) 
  ? path.join(__dirname, '.env.production') 
  : path.join(__dirname, '.env');
require('dotenv').config({ path: envPath });

const { query } = require('./config/db');

const email = process.argv[2];

if (!email) {
  console.log('❌ Please provide an email address.');
  console.log('Usage: node backend/enable_smm.js user@example.com');
  process.exit(1);
}

async function enableSMM() {
  try {
    const [result] = await query('UPDATE users SET is_smm_enabled = 1 WHERE email = ?', [email]);
    if (result.affectedRows > 0) {
      console.log(`✅ Social Media Marketing Hub enabled for: ${email}`);
    } else {
      console.log(`⚠️ No user found with email: ${email}`);
    }
    process.exit(0);
  } catch (err) {
    console.error('❌ Error enabling SMM:', err);
    process.exit(1);
  }
}

enableSMM();
