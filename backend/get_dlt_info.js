require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { query } = require('./config/db');

async function check() {
    try {
        console.log('--- Fetching DLT Templates ---');
        const [rows] = await query('SELECT temp_id, temp_name, pe_id FROM dlt_templates LIMIT 3');
        console.log('DLT Templates:', JSON.stringify(rows, null, 2));

        process.exit(0);
    } catch (e) {
        process.exit(1);
    }
}
check();
