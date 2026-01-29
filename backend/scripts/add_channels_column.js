require('dotenv').config();
const mysql = require('mysql2/promise');

async function addChannelsConfig() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASS || 'root123',
        database: process.env.DB_NAME || 'cell24x7_db'
    });

    try {
        console.log('Connected to database.');

        // Check if column exists
        const [columns] = await connection.query(`
      SHOW COLUMNS FROM users LIKE 'channels_config'
    `);

        if (columns.length === 0) {
            await connection.query(`
        ALTER TABLE users 
        ADD COLUMN channels_config JSON DEFAULT NULL
      `);
            console.log('✅ Added channels_config column to users table');
        } else {
            console.log('ℹ️ channels_config column already exists');
        }

    } catch (err) {
        console.error('Error modifying table:', err);
    } finally {
        await connection.end();
    }
}

addChannelsConfig();
