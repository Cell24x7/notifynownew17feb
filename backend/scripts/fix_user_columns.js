require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { query } = require('../config/db');

async function fixUserColumns() {
    try {
        console.log('--- Checking and Fixing user table columns ---');
        
        // 1. Add pe_id and hash_id to users table if they don't exist
        try {
            await query('ALTER TABLE users ADD COLUMN pe_id VARCHAR(50) AFTER role');
            console.log('✅ Column pe_id added to users table');
        } catch (e) {
            if (e.errno === 1060) console.log('ℹ️ Column pe_id already exists in users table');
            else throw e;
        }

        try {
            await query('ALTER TABLE users ADD COLUMN hash_id VARCHAR(100) AFTER pe_id');
            console.log('✅ Column hash_id added to users table');
        } catch (e) {
            if (e.errno === 1060) console.log('ℹ️ Column hash_id already exists in users table');
            else throw e;
        }

        // 2. Set some defaults if any user has them null but we need them (optional)
        // For Example: iddial@gmail.com (from logs)
        const defaultHash = '99e6e220461cf7b76694385b53ecbb4054fc18f3cce99c10b4d5916390f4bd59';
        const defaultPeId = '1101416990000075651'; // From the error log provided by user
        
        await query('UPDATE users SET pe_id = ?, hash_id = ? WHERE pe_id IS NULL AND hash_id IS NULL AND id = 54', [defaultPeId, defaultHash]);
        console.log('✅ Updated default IDs for UID 54 if missing');

        console.log('--- Migration Complete ---');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        process.exit(1);
    }
}

fixUserColumns();
