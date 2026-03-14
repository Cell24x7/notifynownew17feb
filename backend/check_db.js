require('dotenv').config({ path: './.env.production' });
const { query } = require('./config/db');

async function check() {
    try {
        const [res] = await query('DESCRIBE message_logs');
        console.log(JSON.stringify(res, null, 2));
    } catch (e) {
        console.error(e);
    }
    process.exit();
}
check();
