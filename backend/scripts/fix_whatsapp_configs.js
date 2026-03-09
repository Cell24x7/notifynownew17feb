const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixTable() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASS || '',
        database: process.env.DB_NAME || 'notifynow_db',
    });

    const columnsToAdd = [
        { name: 'provider', sql: "ADD COLUMN provider VARCHAR(50) DEFAULT 'vendor1' AFTER chatbot_name" },
        { name: 'wanumber', sql: "ADD COLUMN wanumber VARCHAR(50) NULL AFTER provider" },
        { name: 'api_key', sql: "ADD COLUMN api_key TEXT NULL AFTER wa_token" },
    ];

    for (const col of columnsToAdd) {
        try {
            await connection.query(`ALTER TABLE whatsapp_configs ${col.sql}`);
            console.log(`✅ Column '${col.name}' added`);
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log(`ℹ️  Column '${col.name}' already exists`);
            } else {
                console.log(`⚠️  Error adding '${col.name}': ${e.message}`);
            }
        }
    }

    const [cols] = await connection.query('DESCRIBE whatsapp_configs');
    console.log('\n📋 Final whatsapp_configs columns:');
    cols.forEach(c => console.log(`   - ${c.Field} (${c.Type})`));

    await connection.end();
    console.log('\n✅ Done!');
}

fixTable();
