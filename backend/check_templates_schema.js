require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { query } = require('./config/db');

async function check() {
    try {
        const [rows] = await query('DESCRIBE message_templates');
        console.log(JSON.stringify(rows, null, 2));
        process.exit(0);
    } catch (e) {
        console.error('Check failed:', e.message);
        process.exit(1);
    }
}
check();
