const path = require('path');
const envPath = path.resolve(__dirname, '.env.production');
require('dotenv').config({ path: envPath });

const { query } = require('./config/db');

async function migrate() {
    try {
        console.log(`🚀 Starting Reseller Payment Gateway Migration... (Env: ${envPath})`);
        
        // Basic check if env is loaded
        if (!process.env.DB_HOST) {
            console.error('❌ Error: DB_HOST is not defined. Env file might be missing or empty.');
            process.exit(1);
        }

        const columnsToAdd = [
            { name: 'payment_gateway_type', type: "VARCHAR(50) DEFAULT 'none'" },
            { name: 'ccavenue_merchant_id', type: 'VARCHAR(255) NULL' },
            { name: 'ccavenue_access_code', type: 'VARCHAR(255) NULL' },
            { name: 'ccavenue_working_key', type: 'VARCHAR(255) NULL' }
        ];

        const [existingCols] = await query('DESCRIBE resellers');
        const colNames = existingCols.map(c => c.Field);

        for (const col of columnsToAdd) {
            if (!colNames.includes(col.name)) {
                console.log(`Adding column: ${col.name}`);
                await query(`ALTER TABLE resellers ADD COLUMN ${col.name} ${col.type}`);
            } else {
                console.log(`Column already exists: ${col.name}`);
            }
        }

        console.log('✅ Migration completed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        process.exit(1);
    }
}

migrate();
