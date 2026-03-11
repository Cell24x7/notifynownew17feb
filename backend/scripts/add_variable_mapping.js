const { query } = require('../config/db');

async function run() {
  try {
    // Check if column already exists
    const [cols] = await query("SHOW COLUMNS FROM campaigns LIKE 'variable_mapping'");
    if (cols.length === 0) {
      await query("ALTER TABLE campaigns ADD COLUMN variable_mapping JSON NULL");
      console.log('✅ Added variable_mapping column to campaigns table');
    } else {
      console.log('ℹ️  variable_mapping column already exists, skipping.');
    }
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  }
  process.exit(0);
}

run();
