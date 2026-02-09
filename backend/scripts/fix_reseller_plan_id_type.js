const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const promisePool = pool.promise();

async function fixSchema() {
    try {
        console.log('Modifying plan_id column to VARCHAR(255)...');
        try {
            await promisePool.query("ALTER TABLE resellers MODIFY COLUMN plan_id VARCHAR(255) NULL");
            console.log('✅ plan_id column modified to VARCHAR(255)');
        } catch (e) {
            console.error('❌ Failed to modify plan_id:', e.message);
        }
        console.log('Schema fix completed.');
    } catch (err) {
        console.error('Migration failed:', err);
    }
    process.exit();
}

fixSchema();
