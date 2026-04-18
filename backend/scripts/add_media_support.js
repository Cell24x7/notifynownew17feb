const { query } = require('../config/db');

async function migrate() {
    console.log('🚀 Starting Media Support Migration...');
    try {
        // 1. Add media_url to webhook_logs
        const [columns] = await query("SHOW COLUMNS FROM webhook_logs LIKE 'media_url'");
        if (columns.length === 0) {
            console.log('📦 Adding media_url column to webhook_logs...');
            await query("ALTER TABLE webhook_logs ADD COLUMN media_url TEXT AFTER message_content");
            console.log('✅ media_url column added.');
        } else {
            console.log('ℹ️ media_url column already exists.');
        }

        // 2. Create uploads directory if it doesn't exist (handled by app usually, but good to check)
        const fs = require('fs');
        const path = require('path');
        const mediaDir = path.join(__dirname, '../uploads/whatsapp_media');
        
        if (!fs.existsSync(mediaDir)) {
            console.log('📂 Creating whatsapp_media directory...');
            fs.mkdirSync(mediaDir, { recursive: true });
            console.log('✅ Directory created.');
        }

        console.log('✨ Migration completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        process.exit(1);
    }
}

migrate();
