require('dotenv').config();
const mysql = require('mysql2/promise');

async function migrate() {
    let connection;
    try {
        console.log('🚀 Connecting to database...');
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME
        });

        console.log('🛠️ Auditing rcs_bot_master table...');
        const [columns] = await connection.execute('SHOW COLUMNS FROM rcs_bot_master');
        const colNames = columns.map(c => c.Field);

        const neededColumns = [
            { name: 'terms_url', type: 'VARCHAR(255) DEFAULT NULL' },
            { name: 'privacy_url', type: 'VARCHAR(255) DEFAULT NULL' },
            { name: 'brand_color', type: "VARCHAR(20) DEFAULT '#000000'" },
            { name: 'development_platform', type: "VARCHAR(50) DEFAULT 'GSMA_API'" },
            { name: 'brand_address', type: 'TEXT' },
            { name: 'brand_industry', type: 'VARCHAR(100)' }
        ];

        for (const col of neededColumns) {
            if (!colNames.includes(col.name)) {
                console.log(`➕ Adding column: ${col.name}...`);
                await connection.execute(`ALTER TABLE rcs_bot_master ADD COLUMN ${col.name} ${col.type}`);
            } else {
                console.log(`✅ Column ${col.name} already exists.`);
            }
        }

        console.log('🏁 Schema update completed successfully.');
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
    } finally {
        if (connection) await connection.end();
    }
}

migrate();
