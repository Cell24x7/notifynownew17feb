const mysql = require('mysql2');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'root123',
    database: 'notifynow_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const promisePool = pool.promise();

async function checkSchema() {
    try {
        const [rows] = await promisePool.query("DESCRIBE resellers");
        console.log(JSON.stringify(rows, null, 2));
    } catch (err) {
        console.error(err);
    }
    process.exit();
}

checkSchema();
