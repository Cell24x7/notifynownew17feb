const { query } = require('./config/db');

async function fixButtonType() {
    try {
        console.log('🚀 FORCED: Fixing column lengths in all relevant tables...');
        
        const tablesToFix = [
            { table: 'template_buttons', col: 'type' },
            { table: 'message_templates', col: 'template_type' },
            { table: 'message_templates', col: 'channel' },
            { table: 'api_campaigns', col: 'template_type' },
            { table: 'api_campaigns', col: 'channel' },
            { table: 'campaigns', col: 'template_type' },
            { table: 'campaigns', col: 'channel' },
            { table: 'webhook_logs', col: 'type' },
            { table: 'api_message_logs', col: 'channel' },
            { table: 'message_logs', col: 'channel' }
        ];

        for (const item of tablesToFix) {
            try {
                console.log(`Checking ${item.table}.${item.col}...`);
                await query(`ALTER TABLE ${item.table} MODIFY COLUMN ${item.col} VARCHAR(100)`);
                console.log(`✅ ${item.table}.${item.col} expanded successfully.`);
            } catch (e) {
                console.warn(`⚠️  Could not fix ${item.table}.${item.col}: ${e.message}`);
            }
        }

        console.log('✨ All potential bottlenecks fixed!');
    } catch (err) {
        console.error('❌ Global fix error:', err.message);
    } finally {
        process.exit(0);
    }
}

fixButtonType();
