require('dotenv').config();
const mysql = require('mysql2/promise');

async function fix() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || process.env.DB_PASS || '',
        database: process.env.DB_NAME || 'notifynow_db',
    });

    try {
        console.log('Checking message_logs schema...');
        const [cols] = await connection.query('SHOW COLUMNS FROM message_logs');
        const colNames = cols.map(c => c.Field);

        if (!colNames.includes('channel')) {
            console.log('Adding channel column...');
            await connection.query('ALTER TABLE message_logs ADD COLUMN channel VARCHAR(50) DEFAULT "rcs" AFTER status');
        }
        
        if (!colNames.includes('message_id')) {
            console.log('Adding message_id column...');
            await connection.query('ALTER TABLE message_logs ADD COLUMN message_id VARCHAR(255) AFTER id');
        }

        if (!colNames.includes('failure_reason')) {
            console.log('Adding failure_reason column...');
            await connection.query('ALTER TABLE message_logs ADD COLUMN failure_reason TEXT AFTER status');
        }

        if (!colNames.includes('delivery_time')) {
            console.log('Adding delivery_time column...');
            await connection.query('ALTER TABLE message_logs ADD COLUMN delivery_time TIMESTAMP NULL AFTER created_at');
        }

        console.log('✅ Schema updated successfully!');
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
    } finally {
        await connection.end();
        process.exit(0);
    }
}

fix();
