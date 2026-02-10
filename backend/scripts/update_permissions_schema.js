const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') }); // Script is in scripts/, .env is in backend root (..)

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
};

console.log('DB Config Loaded:', { user: dbConfig.user, db: dbConfig.database });

async function updateSchema() {
    let connection;
    try {
        console.log('Connecting to database...');
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected.');

        // 1. Add permissions to users
        try {
            console.log('Checking "users" table for permissions column...');
            const [columns] = await connection.query('SHOW COLUMNS FROM users LIKE "permissions"');
            if (columns.length === 0) {
                console.log('Adding "permissions" column to "users" table...');
                await connection.query('ALTER TABLE users ADD COLUMN permissions TEXT DEFAULT NULL');
                console.log('Done.');
            } else {
                console.log('"permissions" column already exists in "users".');
            }
        } catch (err) {
            console.error('Error updating users table:', err.message);
        }

        // 2. Add permissions to resellers
        try {
            console.log('Checking "resellers" table for permissions column...');
            const [columns] = await connection.query('SHOW COLUMNS FROM resellers LIKE "permissions"');
            if (columns.length === 0) {
                console.log('Adding "permissions" column to "resellers" table...');
                await connection.query('ALTER TABLE resellers ADD COLUMN permissions TEXT DEFAULT NULL');
                console.log('Done.');
            } else {
                console.log('"permissions" column already exists in "resellers".');
            }
        } catch (err) {
            console.error('Error updating resellers table:', err.message);
        }

    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        if (connection) await connection.end();
    }
}

updateSchema();
