const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mysql = require('mysql2/promise');

async function checkDb() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME
        });

        console.log('✅ Connected to database');

        const [tables] = await connection.execute('SHOW TABLES');
        console.log('Tables:', tables.map(t => Object.values(t)[0]));

        const [columns] = await connection.execute('SHOW COLUMNS FROM campaigns');
        console.log('Campaign Columns:', columns.map(c => c.Field));

        // Check message_logs specifically
        try {
            const [logs] = await connection.execute('DESCRIBE message_logs');
            console.log('message_logs columns:', logs.map(c => c.Field));
        } catch (e) {
            console.error('❌ message_logs table does not exist or error describing it:', e.message);
        }

        await connection.end();
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

checkDb();
