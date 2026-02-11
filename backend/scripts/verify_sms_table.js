require('dotenv').config();
const mysql = require('mysql2/promise');

async function verifyTable() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASS || 'root123',
        database: process.env.DB_NAME || 'cell24x7_db'
    });

    try {
        console.log('Connected to database.');
        const [rows] = await connection.query("SHOW TABLES LIKE 'sms_channels'");
        if (rows.length > 0) {
            console.log("✅ Table 'sms_channels' EXISTS.");

            const [data] = await connection.query("SELECT count(*) as count FROM sms_channels");
            console.log(`📊 Current record count: ${data[0].count}`);
        } else {
            console.error("❌ Table 'sms_channels' does NOT exist.");
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await connection.end();
    }
}

verifyTable();
