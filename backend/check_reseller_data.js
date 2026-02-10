const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function check() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME
        });

        console.log('Connected to DB');

        // Get all users with role 'reseller'
        const [users] = await connection.query('SELECT id, email, role, permissions FROM users WHERE role = "reseller"');

        console.log('--- RESELLER USERS ---');
        users.forEach(u => {
            console.log(`ID: ${u.id}, Email: ${u.email}`);
            console.log('Permissions (Raw):', u.permissions ? u.permissions.substring(0, 100) + '...' : 'NULL');
            try {
                const parsed = JSON.parse(u.permissions);
                console.log('Permissions (Parsed Count):', Array.isArray(parsed) ? parsed.length : 'Not an array');
                if (Array.isArray(parsed) && parsed.length > 0) {
                    console.log('Sample Permission:', JSON.stringify(parsed[0]));
                    // Check if 'Dashboard - View' is there
                    const dash = parsed.find(p => p.feature === 'Dashboard - View');
                    console.log('Dashboard - View:', dash);
                }
            } catch (e) {
                console.log('Permissions parse error:', e.message);
            }
            console.log('-------------------');
        });

        await connection.end();
    } catch (err) {
        console.error('ERROR:', err);
    }
}

check();
