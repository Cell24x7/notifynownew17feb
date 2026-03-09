const mysql = require('mysql2/promise');
require('dotenv').config();

const addWhatsAppColumns = async () => {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASS || '',
        database: process.env.DB_NAME || 'notifynow_db',
    });

    try {
        console.log('🔄 Adding WhatsApp columns to webhook_logs table...');

        const columnsToAdd = [
            { name: 'user_id', sql: "ADD COLUMN IF NOT EXISTS user_id INT NULL AFTER id" },
            { name: 'sender', sql: "ADD COLUMN IF NOT EXISTS sender VARCHAR(100) NULL AFTER user_id" },
            { name: 'recipient', sql: "ADD COLUMN IF NOT EXISTS recipient VARCHAR(100) NULL AFTER sender" },
            { name: 'message_id', sql: "ADD COLUMN IF NOT EXISTS message_id VARCHAR(255) NULL AFTER message_id_envelope" },
            { name: 'message_content', sql: "ADD COLUMN IF NOT EXISTS message_content TEXT NULL AFTER recipient" },
            { name: 'updated_at', sql: "ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at" },
        ];

        for (const col of columnsToAdd) {
            try {
                await connection.query(`ALTER TABLE webhook_logs ${col.sql}`);
                console.log(`  ✅ Column '${col.name}' added or already exists.`);
            } catch (e) {
                if (e.code === 'ER_DUP_FIELDNAME') {
                    console.log(`  ℹ️  Column '${col.name}' already exists.`);
                } else {
                    console.log(`  ⚠️  Could not add '${col.name}': ${e.message}`);
                }
            }
        }

        // Show final table structure
        const [cols] = await connection.query('DESCRIBE webhook_logs');
        console.log('\n📋 Final webhook_logs table structure:');
        cols.forEach(c => console.log(`   - ${c.Field} (${c.Type})`));

        console.log('\n✅ Done! WhatsApp webhook columns are ready.');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await connection.end();
    }
};

addWhatsAppColumns();
