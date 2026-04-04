const { query } = require('./config/db');
require('dotenv').config({ path: './.env.production' });

async function checkSchema() {
    try {
        console.log('🔍 Checking message_logs schema...');
        const [columns] = await query('DESCRIBE message_logs');
        console.log('Columns:', JSON.stringify(columns, null, 2));

        console.log('\n🔍 Checking api_message_logs schema...');
        const [apiColumns] = await query('DESCRIBE api_message_logs');
        console.log('API Columns:', JSON.stringify(apiColumns, null, 2));

        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

checkSchema();
