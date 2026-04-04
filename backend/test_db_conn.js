require('dotenv').config();
const mysql = require('mysql2/promise');

async function test() {
    try {
        console.log('Connecting with:', {
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            database: process.env.DB_NAME,
            password: process.env.DB_PASS ? '********' : 'MISSING'
        });
        const conn = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME
        });
        console.log('Connection successful!');
        await conn.end();
    } catch (e) {
        console.error('Connection failed:', e.message);
    }
}
test();
