const { query } = require('../config/db');

async function showColumns() {
    const [cols] = await query("SHOW COLUMNS FROM webhook_logs;");
    console.log(cols);
    process.exit(0);
}

showColumns();
