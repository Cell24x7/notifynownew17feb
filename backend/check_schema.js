const { query } = require('./config/db');
require('dotenv').config();

async function checkSchema() {
    try {
        const [columns] = await query("DESCRIBE campaign_queue");
        console.log("Columns in campaign_queue:", columns.map(c => c.Field));
        process.exit(0);
    } catch (err) {
        console.error("Error:", err.message);
        process.exit(1);
    }
}

checkSchema();
