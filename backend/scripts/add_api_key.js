require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { query } = require('../config/db');
const crypto = require('crypto');

async function migrate() {
    try {
        console.log('--- Adding api_key column to users table ---');
        
        // Check if column exists
        const [cols] = await query('SHOW COLUMNS FROM users LIKE "api_key"');
        if (cols.length === 0) {
            await query('ALTER TABLE users ADD COLUMN api_key VARCHAR(100) UNIQUE AFTER email');
            console.log('✅ Column api_key added.');
        } else {
            console.log('ℹ️ Column api_key already exists.');
        }

        // Generate API keys for users who don't have one
        const [users] = await query('SELECT id FROM users WHERE api_key IS NULL');
        console.log(`--- Generating API keys for ${users.length} users ---`);
        
        for (const user of users) {
            const apiKey = 'nn_' + crypto.randomBytes(24).toString('hex');
            await query('UPDATE users SET api_key = ? WHERE id = ?', [apiKey, user.id]);
        }
        
        console.log('✅ Migration complete.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        process.exit(1);
    }
}

migrate();
