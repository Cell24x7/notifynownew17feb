const { query } = require('../config/db');
async function run() {
    try {
        const [rows] = await query('DESCRIBE users');
        console.log(JSON.stringify(rows, null, 2));
    } catch (e) { console.error(e); }
    process.exit(0);
}
run();
