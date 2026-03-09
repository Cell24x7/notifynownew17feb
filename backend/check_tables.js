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

        const tables = ['users', 'resellers'];

        for (const table of tables) {
            console.log(`--- Schema for table: ${table} ---`);
            const [columns] = await connection.execute(`DESCRIBE ${table}`);
            console.log(JSON.stringify(columns, null, 2));
        }

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        if (connection) await connection.end();
    }
}

checkSchema();
