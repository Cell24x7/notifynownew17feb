const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function check() {
    console.log('DB Config:', {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        // Mask password
        passLength: process.env.DB_PASS ? process.env.DB_PASS.length : 0,
        db: process.env.DB_NAME
    });

    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME
        });

        const [rows] = await connection.query('DESCRIBE users');
        console.log('--- USERS TABLE ---');
        console.table(rows);

        // Check if permissions column exists in users
        const hasPermsUser = rows.some(r => r.Field === 'permissions');
        console.log('USERS HAS PERMISSIONS:', hasPermsUser);

        if (!hasPermsUser) {
            console.log('Adding permissions column to users...');
            await connection.query('ALTER TABLE users ADD COLUMN permissions TEXT DEFAULT NULL');
            console.log('DONE.');
        }

        const [rowsResellers] = await connection.query('DESCRIBE resellers');
        console.log('--- RESELLERS TABLE ---');
        console.table(rowsResellers);

        // Check if permissions column exists in resellers
        const hasPermsReseller = rowsResellers.some(r => r.Field === 'permissions');
        console.log('RESELLERS HAS PERMISSIONS:', hasPermsReseller);

        if (!hasPermsReseller) {
            console.log('Adding permissions column to resellers...');
            await connection.query('ALTER TABLE resellers ADD COLUMN permissions TEXT DEFAULT NULL');
            console.log('DONE.');
        }

        await connection.end();
    } catch (err) {
        console.error('CONNECTION ERROR:', err.message);
    }
}

check();
