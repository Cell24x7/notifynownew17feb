require('dotenv').config();
const { query } = require('./config/db');

async function run() {
    try {
        await query('ALTER TABLE dlt_templates ADD COLUMN pe_id VARCHAR(50) DEFAULT NULL, ADD COLUMN hash_id VARCHAR(255) DEFAULT NULL');
        console.log('Columns added successfully');
    } catch (e) {
        console.log('Error adding columns: ' + e.message);
    }
    process.exit(0);
}

run();
