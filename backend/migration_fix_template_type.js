const path = require('path');
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
require('dotenv').config({ path: path.join(__dirname, envFile) });
console.log(`📡 Migration Environment: ${process.env.NODE_ENV || 'development'} (using ${envFile})`);
const { query } = require('./config/db');

async function migrate() {
    try {
        console.log('🚀 Starting migration for campaigns table...');
        
        // 1. Expand template_type to VARCHAR(50) to allow WhatsApp categories (MARKETING, UTILITY, etc.)
        await query('ALTER TABLE campaigns MODIFY COLUMN template_type VARCHAR(50) NULL');
        console.log('✅ Updated template_type to VARCHAR(50)');

        // 2. Also ensure message_templates has same flexibility
        await query('ALTER TABLE message_templates MODIFY COLUMN template_type VARCHAR(50) NULL');
        console.log('✅ Updated message_templates.template_type to VARCHAR(50)');

        console.log('✨ Migration complete!');
    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        process.exit();
    }
}

migrate();
