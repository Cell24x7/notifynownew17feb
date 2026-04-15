const { query } = require('./config/db');

async function migrate() {
    console.log('--- Starting Channel Balance Migration ---');
    try {
        // Add limit columns
        await query(`ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS rcs_limit DECIMAL(15, 4) DEFAULT NULL,
            ADD COLUMN IF NOT EXISTS wa_limit DECIMAL(15, 4) DEFAULT NULL,
            ADD COLUMN IF NOT EXISTS sms_limit DECIMAL(15, 4) DEFAULT NULL,
            ADD COLUMN IF NOT EXISTS voice_limit DECIMAL(15, 4) DEFAULT NULL`);
        
        console.log('✅ Channel balance columns added successfully.');
    } catch (err) {
        if (err.code === 'ER_DUP_COLUMN_NAME') {
            console.log('ℹ️ Columns already exist.');
        } else {
            console.error('❌ Migration failed:', err.message);
        }
    }
    process.exit();
}

migrate();
