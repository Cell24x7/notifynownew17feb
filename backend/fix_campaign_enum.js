const { query } = require('./config/db');

async function fix() {
    try {
        console.log('🔄 Fixing campaigns table status enum...');
        
        // 1. Get current enum values
        const [rows] = await query("SHOW COLUMNS FROM campaigns LIKE 'status'");
        const currentType = rows[0].Type; // e.g. enum('draft','running','completed')
        
        if (!currentType.includes('failed')) {
            console.log(`Current type is ${currentType}. Adding 'failed'...`);
            // We need to construct the new enum string. 
            // Usually it looks like enum('val1','val2')
            const newVal = currentType.replace(')', ",'failed')");
            const alterSql = `ALTER TABLE campaigns MODIFY COLUMN status ${newVal}`;
            await query(alterSql);
            console.log('✅ Added "failed" to status enum.');
        } else {
            console.log('ℹ️ "failed" already exists in status enum.');
        }

        // 2. Also check if "checking_credits" exists (used in bulk API)
        const [rows2] = await query("SHOW COLUMNS FROM campaigns LIKE 'status'");
        const currentType2 = rows2[0].Type;
        if (!currentType2.includes('checking_credits')) {
             console.log(`Current type is ${currentType2}. Adding 'checking_credits'...`);
             const newVal = currentType2.replace(')', ",'checking_credits')");
             await query(`ALTER TABLE campaigns MODIFY COLUMN status ${newVal}`);
             console.log('✅ Added "checking_credits" to status enum.');
        }

    } catch (err) {
        console.error('❌ Fix Error:', err.message);
    } finally {
        process.exit();
    }
}

fix();
