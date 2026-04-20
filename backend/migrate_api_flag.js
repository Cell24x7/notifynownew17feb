require('dotenv').config();
const { query } = require('./config/db');

async function migrate() {
    try {
        console.log('🚀 Starting DB Migration...');
        await query(`ALTER TABLE users ADD COLUMN is_api_allowed BOOLEAN DEFAULT FALSE`);
        console.log('✅ Success: is_api_allowed column added.');
        process.exit(0);
    } catch (err) {
        if (err.code === 'ER_DUP_COLUMN_NAME') {
            console.log('ℹ️ Column already exists, skipping.');
            process.exit(0);
        }
        console.error('❌ Migration failed:', err.message);
        process.exit(1);
    }
}

migrate();
