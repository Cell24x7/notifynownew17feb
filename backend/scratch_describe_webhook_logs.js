const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { query } = require('./config/db');

async function test() {
    try {
        const [rows1] = await query('DESCRIBE message_logs');
        console.log('message_logs schema:');
        console.log(JSON.stringify(rows1, null, 2));

        const [rows2] = await query('DESCRIBE api_message_logs');
        console.log('api_message_logs schema:');
        console.log(JSON.stringify(rows2, null, 2));
    } catch (e) {
        console.error('Failed:', e.message);
    }
    process.exit(0);
}
test();
