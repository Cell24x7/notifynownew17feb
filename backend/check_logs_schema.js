require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkSchema() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME
        });

        const tables = ['message_logs', 'webhook_logs'];

        for (const table of tables) {
            console.log(`--- Schema for table: ${table} ---`);
            try {
                const [columns] = await connection.execute(`DESCRIBE ${table}`);
                console.log(JSON.stringify(columns));
            } catch (e) {
                console.log(`Table ${table} does not exist: ${e.message}`);
            }
        }

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        if (connection) await connection.end();
    }
}

checkSchema();
