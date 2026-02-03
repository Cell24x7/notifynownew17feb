const { query } = require('../config/db');

async function verifySchema() {
    try {
        console.log('Verifying campaigns table schema...');
        const [columns] = await query(`SHOW COLUMNS FROM campaigns`);

        const columnNames = columns.map(c => c.Field);
        console.log('Current columns:', columnNames.join(', '));

        if (columnNames.includes('audience_id')) {
            console.log('✅ VERIFIED: audience_id column exists.');
        } else {
            console.error('❌ FAILED: audience_id column is still missing.');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error verifying schema:', error);
        process.exit(1);
    }
}

verifySchema();
