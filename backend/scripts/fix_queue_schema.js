const { query } = require('../config/db');

const fix = async () => {
    try {
        console.log('🔄 Updating campaign_queue status column...');
        await query('ALTER TABLE campaign_queue MODIFY COLUMN status VARCHAR(50) DEFAULT "pending"');
        
        console.log('🔄 Updating api_campaign_queue status column...');
        await query('ALTER TABLE api_campaign_queue MODIFY COLUMN status VARCHAR(50) DEFAULT "pending"');
        
        console.log('✅ Status columns updated successfully to VARCHAR(50)');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        process.exit(1);
    }
};

fix();
