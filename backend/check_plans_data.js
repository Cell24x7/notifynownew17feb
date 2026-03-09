require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkPlans() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME
        });

        const [rows] = await connection.execute('SELECT name, channels_allowed FROM plans');
        rows.forEach(row => {
            console.log(`Plan: ${row.name}`);
            console.log(`Channels: ${row.channels_allowed}`);
            console.log('---');
        });

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        if (connection) await connection.end();
    }
}

checkPlans();
