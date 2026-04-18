const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.production') });
const { query } = require('../config/db');

async function checkSchema() {
    console.log('\n--- MESSAGE_LOGS SCHEMA ---');
    try {
        const [msgCols] = await query('SHOW COLUMNS FROM message_logs');
        console.table(msgCols);
    } catch (e) { console.error('Error fetching message_logs:', e.message); }

    console.log('\n--- API_MESSAGE_LOGS SCHEMA ---');
    try {
        const [apiCols] = await query('SHOW COLUMNS FROM api_message_logs');
        console.table(apiCols);
    } catch (e) { console.error('Error fetching api_message_logs:', e.message); }

    process.exit(0);
}

checkSchema();
