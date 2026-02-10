const mysql = require('mysql2/promise');

// Hardcoded config
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'root123',
    database: 'notifynow_db'
});

async function addResellerRole() {
    try {
        console.log("Altering table to add 'reseller' role...");
        await pool.query("ALTER TABLE users MODIFY COLUMN role ENUM('user', 'admin', 'reseller') DEFAULT 'user'");
        console.log("Success! Role 'reseller' added.");
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

addResellerRole();
