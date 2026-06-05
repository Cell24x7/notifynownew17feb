const path = require('path');
const dotenv = require('dotenv');
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
dotenv.config({ path: path.join(__dirname, '..', envFile) });

const { query } = require('../config/db');

async function turboOptimize() {
    console.log('🚀 --- STARTING SUPER-TURBO SPEED OPTIMIZATION ---');
    
    const tasks = [
        // 1. Campaigns & API Campaigns (Dashboard & Reports SPEED)
        { table: 'campaigns', index: 'idx_user_created', cols: '(user_id, created_at)' },
        { table: 'campaigns', index: 'idx_created_at', cols: '(created_at)' },
        { table: 'campaigns', index: 'idx_status', cols: '(status)' },
        
        { table: 'api_campaigns', index: 'idx_user_created', cols: '(user_id, created_at)' },
        { table: 'api_campaigns', index: 'idx_created_at', cols: '(created_at)' },
        { table: 'api_campaigns', index: 'idx_user_id', cols: '(user_id)' },
        
        // 2. Message Logs (Detailed Reports SPEED)
        { table: 'message_logs', index: 'idx_camp_user', cols: '(campaign_id, user_id)' },
        { table: 'message_logs', index: 'idx_created_at', cols: '(created_at)' },
        { table: 'message_logs', index: 'idx_camp_rec_status', cols: '(campaign_id, recipient, status)' },
        { table: 'message_logs', index: 'idx_user_id', cols: '(user_id)' },
        { table: 'message_logs', index: 'idx_user_recipient_created', cols: '(user_id, recipient, created_at)' },
        
        { table: 'api_message_logs', index: 'idx_camp_user', cols: '(campaign_id, user_id)' },
        { table: 'api_message_logs', index: 'idx_created_at', cols: '(created_at)' },
        { table: 'api_message_logs', index: 'idx_camp_rec_status', cols: '(campaign_id, recipient, status)' },
        { table: 'api_message_logs', index: 'idx_user_id', cols: '(user_id)' },
        { table: 'api_message_logs', index: 'idx_user_rec_sendtime', cols: '(user_id, recipient, send_time)' },

        // 3. Transactions (Finance & Ledger SPEED)
        { table: 'transactions', index: 'idx_user_created', cols: '(user_id, created_at)' },
        { table: 'transactions', index: 'idx_created_at', cols: '(created_at)' },
        { table: 'transactions', index: 'idx_type', cols: '(type)' },

        // 4. Templates (Templates Page SPEED)
        { table: 'message_templates', index: 'idx_user_channel', cols: '(user_id, channel)' },
        { table: 'message_templates', index: 'idx_name_user', cols: '(name, user_id)' },
        
        // 5. Contacts & Chats (Contacts & Chat SPEED)
        { table: 'contacts', index: 'idx_user_phone', cols: '(user_id, phone)' },
        { table: 'webhook_logs', index: 'idx_user_recipient', cols: '(user_id, recipient)' },
        { table: 'webhook_logs', index: 'idx_campaign_id', cols: '(campaign_id)' },
        { table: 'webhook_logs', index: 'idx_type_status', cols: '(type, status)' },
        { table: 'webhook_logs', index: 'idx_user_type_status', cols: '(user_id, type, status)' },
        { table: 'webhook_logs', index: 'idx_created_at', cols: '(created_at)' },
        { table: 'webhook_logs', index: 'idx_status', cols: '(status)' },
        { table: 'webhook_logs', index: 'idx_status_type', cols: '(status, type)' },
        { table: 'webhook_logs', index: 'idx_user_status_type', cols: '(user_id, status, type)' }
    ];

    async function indexExists(tableName, indexName) {
        try {
            const [rows] = await query(`
                SELECT INDEX_NAME 
                FROM INFORMATION_SCHEMA.STATISTICS 
                WHERE TABLE_SCHEMA = DATABASE() 
                  AND TABLE_NAME = ? 
                  AND INDEX_NAME = ? 
                LIMIT 1
            `, [tableName, indexName]);
            return rows && rows.length > 0;
        } catch (err) {
            return false;
        }
    }

    for (const task of tasks) {
        try {
            const exists = await indexExists(task.table, task.index);
            if (exists) {
                console.log(`⚡ ${task.table}.${task.index} already exists. Skipping.`);
            } else {
                process.stdout.write(`⚡ Optimizing ${task.table}.${task.index}... `);
                await query(`ALTER TABLE ${task.table} ADD INDEX ${task.index} ${task.cols}`);
                console.log('✅ Done');
            }
        } catch (err) {
            console.log(`⚠️ Note: ${err.message}`);
        }
    }

    console.log('✨ --- DATABASE IS NOW OPTIMIZED FOR INSTANT LOADING ---');
    process.exit(0);
}

turboOptimize();
