
require('dotenv').config({ path: '.env.production' });
const mysql = require('mysql2/promise');

async function check() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME
    });

    try {
        const [rows] = await connection.execute("SELECT * FROM sms_gateways WHERE name = 'GW3' OR id = 3");
        console.log('--- Gateway Configuration ---');
        console.log(JSON.stringify(rows[0], null, 2));

        const [users] = await connection.execute("SELECT * FROM users WHERE id = 35");
        console.log('\n--- User 35 Configuration ---');
        console.log(JSON.stringify(users[0], null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        await connection.end();
    }
}

check();
