require('dotenv').config();
const mysql = require('mysql2/promise');

async function updateSchema() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME
        });

        console.log('--- Applying schema changes ---');

        // 1. Add reseller_id to users if it doesn't exist
        const [userCols] = await connection.execute('DESCRIBE users');
        const hasResellerId = userCols.some(col => col.Field === 'reseller_id');
        if (!hasResellerId) {
            console.log('Adding reseller_id to users table...');
            await connection.execute('ALTER TABLE users ADD COLUMN reseller_id INT AFTER plan_id');
            // Populate reseller_id from parent_reseller_id if it exists
            const hasParentResellerId = userCols.some(col => col.Field === 'parent_reseller_id');
            if (hasParentResellerId) {
                console.log('Syncing parent_reseller_id to reseller_id...');
                await connection.execute('UPDATE users SET reseller_id = parent_reseller_id WHERE reseller_id IS NULL');
            }
        } else {
            console.log('reseller_id already exists in users table.');
        }

        // 2. Add branding columns to resellers if they don't exist
        const [resellerCols] = await connection.execute('DESCRIBE resellers');
        const brandingCols = [
            { name: 'brand_name', type: 'VARCHAR(100)' },
            { name: 'logo_url', type: 'VARCHAR(255)' },
            { name: 'favicon_url', type: 'VARCHAR(255)' },
            { name: 'primary_color', type: 'VARCHAR(20)' },
            { name: 'secondary_color', type: 'VARCHAR(20)' },
            { name: 'support_email', type: 'VARCHAR(255)' },
            { name: 'support_phone', type: 'VARCHAR(20)' }
        ];

        for (const col of brandingCols) {
            const exists = resellerCols.some(rCol => rCol.Field === col.name);
            if (!exists) {
                console.log(`Adding ${col.name} to resellers table...`);
                await connection.execute(`ALTER TABLE resellers ADD COLUMN ${col.name} ${col.type}`);
            } else {
                console.log(`${col.name} already exists in resellers table.`);
            }
        }

        console.log('Schema update completed successfully.');

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        if (connection) await connection.end();
    }
}

updateSchema();
