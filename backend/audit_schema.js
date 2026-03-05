require('dotenv').config();
const mysql = require('mysql2/promise');

async function run() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME
        });

        const tables = [
            'message_logs',
            'campaign_queue',
            'contacts',
            'webhook_logs',
            'transactions',
            'sender_ids',
            'rcs_configs',
            'affiliates'
        ];

        for (const table of tables) {
            try {
                const [cols] = await connection.execute('SHOW COLUMNS FROM ' + table);
                const hasUsr = cols.some(c => c.Field === 'user_id');
                console.log(`${table}: ${hasUsr ? 'YES' : 'NO'}`);
            } catch (e) {
                console.log(`${table}: ERROR (${e.message})`);
            }
        }
    } catch (err) {
        console.error('Connection failed:', err.message);
    } finally {
        if (connection) await connection.end();
    }
}

run();
