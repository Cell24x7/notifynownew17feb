const bcrypt = require('bcryptjs');
// const dotenv = require('dotenv');
// dotenv.config(); 
const mysql = require('mysql2/promise');

// Hardcoded config for immediate debug
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'root123', // From previous .env read
    database: 'notifynow_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function query(sql, params) {
    const [results] = await pool.execute(sql, params);
    return [results];
}

async function debugLogin() {
    const email = 'shyam@gmail.com';
    const password = '12345678';

    console.log(`--- Debugging Login for ${email} ---`);

    try {
        // 1. Fetch User
        const [users] = await query('SELECT * FROM users WHERE email = ?', [email]);
        console.log(`Found ${users.length} user(s)`);

        if (users.length === 0) {
            console.log('User not found in DB!');
            process.exit(1);
        }

        const user = users[0];
        console.log('User Record:', {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            passwordHash: user.password
        });

        // 2. Check Password
        console.log(`Testing password: "${password}"`);
        const match = await bcrypt.compare(password, user.password);
        console.log('Password Match Result:', match);

        if (match) {
            console.log('SUCCESS: Password is correct. Login *should* work.');
        } else {
            console.log('FAILURE: Password mismatch.');

            // Test hashing checking
            const newHash = await bcrypt.hash(password, 10);
            console.log('New Hash of input would be:', newHash);
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit(0);
    }
}

debugLogin();
