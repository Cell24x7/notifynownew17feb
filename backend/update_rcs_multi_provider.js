const path = require('path');
const fs = require('fs');

// Try to load .env.production first, then .env
const envPath = fs.existsSync(path.join(__dirname, '.env.production')) 
  ? path.join(__dirname, '.env.production') 
  : path.join(__dirname, '.env');

require('dotenv').config({ path: envPath });
console.log(`📡 Using environment file: ${path.basename(envPath)}`);

const { query } = require('./config/db');

async function updateRcsSchema() {
  console.log('🚀 Starting Multi-Provider RCS Schema Update...');

  try {
    // 1. Add provider column
    await query(`
      ALTER TABLE rcs_configs 
      ADD COLUMN IF NOT EXISTS provider VARCHAR(50) DEFAULT 'dotgo' AFTER name
    `);
    console.log('✅ Added "provider" column to rcs_configs');

    // 2. Add extra_config for future-proofing
    await query(`
      ALTER TABLE rcs_configs 
      ADD COLUMN IF NOT EXISTS extra_config JSON DEFAULT NULL AFTER bot_id
    `);
    console.log('✅ Added "extra_config" column to rcs_configs');

    console.log('\n✨ RCS Multi-Provider Schema Update Completed Successfully!');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Schema Update Failed:', err);
    process.exit(1);
  }
}

updateRcsSchema();
