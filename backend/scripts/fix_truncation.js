const { query } = require('./config/db');

async function fixButtonType() {
    try {
        console.log('🚀 Fixing column lengths to prevent truncation...');
        
        // Fix template_buttons
        await query('ALTER TABLE template_buttons MODIFY COLUMN type VARCHAR(100)');
        console.log('✅ template_buttons.type expanded to 100');

        // Fix message_templates
        await query('ALTER TABLE message_templates MODIFY COLUMN template_type VARCHAR(100)');
        console.log('✅ message_templates.template_type expanded to 100');

        // Fix webhook_logs if any
        await query('ALTER TABLE webhook_logs MODIFY COLUMN type VARCHAR(100)');
        console.log('✅ webhook_logs.type expanded to 100');

        console.log('✨ All columns fixed successfully!');
    } catch (err) {
        console.error('❌ Fix failed:', err.message);
    } finally {
        process.exit(0);
    }
}

fixButtonType();
