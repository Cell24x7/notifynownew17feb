const path = require('path');
const dotenv = require('dotenv');
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
dotenv.config({ path: path.join(__dirname, '..', envFile) });

const { query } = require('../config/db');

async function turboOptimize() {
    console.log('🚀 --- STARTING SUPER-TURBO SPEED OPTIMIZATION ---');
    
    const tasks = [
        // 1. Campaigns & API Campaigns (Dashboard & Reports SPEED)
        { table: 'campaigns', sql: 'ADD INDEX IF NOT EXISTS idx_user_created (user_id, created_at)' },
        { table: 'campaigns', sql: 'ADD INDEX IF NOT EXISTS idx_created_at (created_at)' },
        { table: 'campaigns', sql: 'ADD INDEX IF NOT EXISTS idx_status (status)' },
        
        { table: 'api_campaigns', sql: 'ADD INDEX IF NOT EXISTS idx_user_created (user_id, created_at)' },
        { table: 'api_campaigns', sql: 'ADD INDEX IF NOT EXISTS idx_created_at (created_at)' },
        { table: 'api_campaigns', sql: 'ADD INDEX IF NOT EXISTS idx_user_id (user_id)' },
        
        // 2. Message Logs (Detailed Reports SPEED)
        { table: 'message_logs', sql: 'ADD INDEX IF NOT EXISTS idx_camp_user (campaign_id, user_id)' },
        { table: 'message_logs', sql: 'ADD INDEX IF NOT EXISTS idx_created_at (created_at)' },
        { table: 'api_message_logs', sql: 'ADD INDEX IF NOT EXISTS idx_camp_user (campaign_id, user_id)' },
        { table: 'api_message_logs', sql: 'ADD INDEX IF NOT EXISTS idx_created_at (created_at)' },

        // 3. Transactions (Finance & Ledger SPEED)
        { table: 'transactions', sql: 'ADD INDEX IF NOT EXISTS idx_user_created (user_id, created_at)' },
        { table: 'transactions', sql: 'ADD INDEX IF NOT EXISTS idx_created_at (created_at)' },
        { table: 'transactions', sql: 'ADD INDEX IF NOT EXISTS idx_type (type)' },

        // 4. Templates (Templates Page SPEED)
        { table: 'message_templates', sql: 'ADD INDEX IF NOT EXISTS idx_user_channel (user_id, channel)' },
        
        // 5. Contacts & Chats (Contacts & Chat SPEED)
        { table: 'contacts', sql: 'ADD INDEX IF NOT EXISTS idx_user_phone (user_id, phone)' },
        { table: 'webhook_logs', sql: 'ADD INDEX IF NOT EXISTS idx_user_recipient (user_id, recipient)' }
    ];

    for (const task of tasks) {
        try {
            process.stdout.write(`⚡ Optimizing ${task.table}... `);
            await query(`ALTER TABLE ${task.table} ${task.sql}`);
            console.log('✅ Done');
        } catch (err) {
            console.log(`⚠️ Note: ${err.message}`);
        }
    }

    console.log('✨ --- DATABASE IS NOW OPTIMIZED FOR INSTANT LOADING ---');
    process.exit(0);
}

turboOptimize();
