require('dotenv').config();
const { query } = require('../config/db');

async function test() {
    try {
        console.log('--- SYSTEM LOGS FOR TICKETS ---');
        const [logs] = await query("SELECT * FROM system_logs WHERE details LIKE '%ticket%' OR action LIKE '%ticket%' ORDER BY id DESC LIMIT 10");

        console.log(logs);

    } catch (e) {
        console.error('DB TEST ERROR:', e.message);
    } finally {
        process.exit();
    }
}

test();
