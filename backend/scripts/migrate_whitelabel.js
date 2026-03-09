require('dotenv').config();
const mysql = require('mysql2/promise');

async function migrate() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME
        });

        console.log('🚀 Starting Whitelabel & Multi-tenancy Migration...');

        // 1. Add white-label columns to resellers table
        const resellerColumns = [
            { name: 'logo_url', type: 'VARCHAR(255) NULL' },
            { name: 'brand_name', type: 'VARCHAR(100) NULL' },
            { name: 'favicon_url', type: 'VARCHAR(255) NULL' },
            { name: 'primary_color', type: 'VARCHAR(20) DEFAULT "#3b82f6"' },
            { name: 'secondary_color', type: 'VARCHAR(20) DEFAULT "#1d4ed8"' },
            { name: 'support_email', type: 'VARCHAR(100) NULL' },
            { name: 'support_phone', type: 'VARCHAR(20) NULL' }
        ];

        for (const col of resellerColumns) {
            try {
                await connection.execute(`ALTER TABLE resellers ADD COLUMN ${col.name} ${col.type}`);
                console.log(`✅ Added ${col.name} to resellers`);
            } catch (e) {
                if (e.code === 'ER_DUP_COLUMN_NAME') {
                    console.log(`ℹ️ Column ${col.name} already exists in resellers.`);
                } else {
                    console.error(`❌ Error adding ${col.name}: ${e.message}`);
                }
            }
        }

        // 2. Add brand_name to users table (optional but good for context)
        // 3. Add parent_id (reseller_id) to users table
        try {
            await connection.execute(`ALTER TABLE users ADD COLUMN reseller_id INT NULL AFTER id`);
            console.log(`✅ Added reseller_id to users`);
        } catch (e) {
            if (e.code === 'ER_DUP_COLUMN_NAME') {
                console.log(`ℹ️ Column reseller_id already exists in users.`);
            } else {
                console.error(`❌ Error adding reseller_id to users: ${e.message}`);
            }
        }

        // 4. Update existing resellers to have themselves as reseller_id in users if needed
        // (Usually reseller users don't have a reseller_id, they ARE the reseller)
        // But their clients WILL have reseller_id = reseller.id

        console.log('🏁 Migration finished successfully.');

    } catch (err) {
        console.error('❌ Migration failed:', err.message);
    } finally {
        if (connection) await connection.end();
    }
}

migrate();
