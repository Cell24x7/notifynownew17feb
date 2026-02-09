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

async function migrate() {
    try {
        console.log('Adding plan_id column...');
        try {
            await promisePool.query("ALTER TABLE resellers ADD COLUMN plan_id INT NULL");
            console.log('✅ plan_id column added');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('⚠️ plan_id column already exists');
            } else {
                console.error('❌ Failed to add plan_id:', e.message);
            }
        }

        console.log('Adding channels_enabled column...');
        try {
            await promisePool.query("ALTER TABLE resellers ADD COLUMN channels_enabled JSON NULL");
            console.log('✅ channels_enabled column added');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('⚠️ channels_enabled column already exists');
            } else {
                console.error('❌ Failed to add channels_enabled:', e.message);
            }
        }

        console.log('Migration completed.');
    } catch (err) {
        console.error('Migration failed:', err);
    }
    process.exit();
}

migrate();
