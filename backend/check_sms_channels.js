const { query } = require('./config/db');
require('dotenv').config();

async function check() {
    try {
        const [rows] = await query('DESCRIBE sms_channels');
        console.log(JSON.stringify(rows, null, 2));
        process.exit(0);
    } catch (e) {
        console.error('Check failed:', e.message);
        process.exit(1);
    }
}
check();
