const { query } = require('../config/db');

async function fixSchema() {
    try {
        console.log('Checking campaigns table schema...');

        // Check if column exists
        const [columns] = await query(`SHOW COLUMNS FROM campaigns LIKE 'audience_id'`);

        if (columns.length > 0) {
            console.log('✅ audience_id column already exists.');
        } else {
            console.log('⚠️ audience_id column missing. Adding it now...');
            await query(`ALTER TABLE campaigns ADD COLUMN audience_id VARCHAR(36) NULL AFTER template_id`);
            console.log('✅ Successfully added audience_id column to campaigns table.');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error updating schema:', error);
        process.exit(1);
    }
}

fixSchema();
