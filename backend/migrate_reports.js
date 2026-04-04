const { query } = require('./config/db');
require('dotenv').config({ path: './.env.production' });

async function migrate() {
    try {
        console.log('🔄 Checking message_logs schema for message_content...');
        const [cols] = await query("SHOW COLUMNS FROM message_logs LIKE 'message_content'");
        if (cols.length === 0) {
            await query("ALTER TABLE message_logs ADD COLUMN message_content TEXT AFTER template_name");
            console.log('✅ Added message_content to message_logs');
        } else {
            console.log('ℹ️ message_content already exists in message_logs');
        }

        console.log('🔄 Checking api_message_logs schema for message_content...');
        const [apiCols] = await query("SHOW COLUMNS FROM api_message_logs LIKE 'message_content'");
        if (apiCols.length === 0) {
            await query("ALTER TABLE api_message_logs ADD COLUMN message_content TEXT AFTER template_name");
            console.log('✅ Added message_content to api_message_logs');
        } else {
            console.log('ℹ️ message_content already exists in api_message_logs');
        }

        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        process.exit(1);
    }
}

migrate();
