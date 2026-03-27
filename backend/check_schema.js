const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { query } = require('./config/db');
async function check() {
    try {
        const [cols] = await query('DESCRIBE campaign_queue');
        console.log(JSON.stringify(cols, null, 2));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
