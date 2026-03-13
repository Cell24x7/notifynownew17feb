require('dotenv').config({ path: require('path').resolve(__dirname, process.env.NODE_ENV === 'production' ? '.env.production' : '.env') });
const { query } = require('./config/db');

async function migrate() {
    console.log('--- Checking webhook_logs columns for Campaign details ---');
    try {
        const [cols] = await query('SHOW COLUMNS FROM webhook_logs');
        const fields = cols.map(c => c.Field);
        
        if (!fields.includes('campaign_id')) {
            console.log('Adding campaign_id column...');
            await query('ALTER TABLE webhook_logs ADD COLUMN campaign_id VARCHAR(255) NULL');
        }
        if (!fields.includes('campaign_name')) {
            console.log('Adding campaign_name column...');
            await query('ALTER TABLE webhook_logs ADD COLUMN campaign_name VARCHAR(255) NULL');
        }
        if (!fields.includes('template_name')) {
            console.log('Adding template_name column...');
            await query('ALTER TABLE webhook_logs ADD COLUMN template_name VARCHAR(255) NULL');
        }
        if (!fields.includes('channel')) {
            console.log('Adding channel column...');
            await query('ALTER TABLE webhook_logs ADD COLUMN channel VARCHAR(50) NULL');
        }

        console.log('Migration complete. Columns verified.');
    } catch (e) {
        console.error('Migration failed:', e.message);
    }
    process.exit(0);
}

migrate();
