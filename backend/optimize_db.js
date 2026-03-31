require('dotenv').config();
const { query } = require('./config/db');

async function optimize() {
    console.log('🚀 Starting Database Optimization for 1Cr+ Scale...');
    
    try {
        // 1. Index for Webhook Logs (Speed up Reports)
        console.log('📦 Optimizing webhook_logs (Step 1/3)...');
        await query(`ALTER TABLE webhook_logs ADD INDEX IF NOT EXISTS idx_created_at (created_at)`);
        await query(`ALTER TABLE webhook_logs ADD INDEX IF NOT EXISTS idx_user_id (user_id)`);
        await query(`ALTER TABLE webhook_logs ADD INDEX IF NOT EXISTS idx_message_id (message_id)`);
        console.log('✅ Webhook logs optimized.');

        // 2. Index for Message Logs (Speed up Detailed Reports)
        console.log('📊 Optimizing message_logs (Step 2/3)...');
        await query(`ALTER TABLE message_logs ADD INDEX IF NOT EXISTS idx_campaign_id (campaign_id)`);
        await query(`ALTER TABLE message_logs ADD INDEX IF NOT EXISTS idx_user_id (user_id)`);
        await query(`ALTER TABLE message_logs ADD INDEX IF NOT EXISTS idx_recipient (recipient)`);
        console.log('✅ Message logs optimized.');

        // 3. Index for API Message Logs
        console.log('📡 Optimizing api_message_logs (Step 3/3)...');
        await query(`ALTER TABLE api_message_logs ADD INDEX IF NOT EXISTS idx_campaign_id (campaign_id)`);
        await query(`ALTER TABLE api_message_logs ADD INDEX IF NOT EXISTS idx_user_id (user_id)`);
        await query(`ALTER TABLE api_message_logs ADD INDEX IF NOT EXISTS idx_recipient (recipient)`);
        console.log('✅ API logs optimized.');

        console.log('✨ DATABASE OPTIMIZATION COMPLETE! Your server is now 1Cr-Ready.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Optimization failed:', error.message);
        process.exit(1);
    }
}

optimize();
