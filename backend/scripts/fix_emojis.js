const path = require('path');
const dotenv = require('dotenv');

// Smart env loading: production uses .env.production, dev uses .env
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
dotenv.config({ path: path.join(__dirname, '..', envFile) });

const { query } = require('../config/db');

async function fixEmojis() {
    console.log('--- Starting Emoji UTF8MB4 Fix ---');
    try {
        const tables = [
            'api_campaigns', 
            'api_message_logs', 
            'api_campaign_queue', 
            'campaigns', 
            'message_logs', 
            'campaign_queue',
            'message_templates',
            'webhook_logs'
        ];
        
        for (const table of tables) {
            try {
                process.stdout.write(`Converting ${table} to utf8mb4... `);
                await query(`ALTER TABLE ${table} CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
                console.log('✅ Done');
            } catch (err) {
                if (err.code === 'ER_BAD_TABLE_ERROR') {
                    console.log("⚠️ Skipping (Table doesn't exist)");
                } else {
                    console.log(`❌ Failed: ${err.message}`);
                }
            }
        }
        
        console.log('--- Database Emoji Fix Finished ---');
    } catch (err) {
        console.error('❌ Critical Error:', err.message);
    }
    process.exit();
}

fixEmojis();
