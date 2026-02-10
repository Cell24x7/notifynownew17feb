const mysql = require('mysql2/promise');

// Hardcoded config
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'root123',
    database: 'notifynow_db'
});

async function checkSchema() {
    try {
        const [rows] = await pool.query("SHOW COLUMNS FROM users LIKE 'role'");
        console.log(rows);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkSchema();
