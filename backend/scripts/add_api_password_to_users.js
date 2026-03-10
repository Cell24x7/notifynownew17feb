require('dotenv').config();
const { query } = require('../config/db');

async function migrate() {
    try {
        await query(`ALTER TABLE users ADD COLUMN api_password VARCHAR(255) NULL`);
        console.log('✅ Column api_password added to users table');
    } catch (e) {
        if (e.code === 'ER_DUP_FIELDNAME') {
            console.log('ℹ️ Column api_password already exists');
        } else {
            console.error('❌ Error:', e);
        }
    }
    process.exit(0);
}
migrate();
