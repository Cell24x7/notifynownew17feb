const { query } = require('./backend/config/db');
require('dotenv').config({ path: './backend/.env' });

async function check() {
    try {
        console.log('--- Checking SMS Gateways Table ---');
        const [gateways] = await query('SHOW TABLES LIKE "sms_gateways"');
        console.log('sms_gateways table exists:', gateways.length > 0);

        console.log('--- Checking Users Table Columns ---');
        const [cols] = await query('SHOW COLUMNS FROM users LIKE "sms_gateway_id"');
        console.log('sms_gateway_id in users:', cols.length > 0);

        process.exit(0);
    } catch (e) {
        console.error('Check failed:', e.message);
        process.exit(1);
    }
}

check();
