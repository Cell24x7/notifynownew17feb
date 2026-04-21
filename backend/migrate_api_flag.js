const path = require('path');
const dotenv = require('dotenv');

// Smart env loading: production uses .env.production, dev uses .env
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
dotenv.config({ path: path.join(__dirname, envFile) });

console.log(`📡 Migration Environment: ${process.env.NODE_ENV || 'development'} (using ${envFile})`);

const { query } = require('./config/db');

async function migrate() {
    try {
        console.log('🚀 Starting DB Migration...');
        await query(`ALTER TABLE users ADD COLUMN is_api_allowed BOOLEAN DEFAULT FALSE`);
        console.log('✅ Success: is_api_allowed column added.');
        process.exit(0);
    } catch (err) {
        if (err.code === 'ER_DUP_COLUMN_NAME' || err.message.includes('Duplicate column name')) {
            console.log('ℹ️ Column already exists, skipping.');
            process.exit(0);
        }
        console.error('❌ Migration failed:', err.message);
        process.exit(1);
    }
}

migrate();
