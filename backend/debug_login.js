const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const logFile = path.join(__dirname, 'debug_log_direct.txt');
const log = (msg) => {
    console.log(msg);
    fs.appendFileSync(logFile, msg + '\n');
};

if (fs.existsSync(logFile)) fs.unlinkSync(logFile);

async function debugLogin() {
    log('--- LOGIN DEBUGGER ---');
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME
        });

        const [users] = await connection.query('SELECT id, email, contact_phone, password, role FROM users');
        log(`Found ${users.length} users.`);

        for (const user of users) {
            const passDisplay = (!user.password || user.password.length < 10) ? 'INVALID/EMPTY' : (user.password.substring(0, 10) + '...');
            log(`\nUser: [${user.id}] ${user.email} (${user.role})`);
            log(`  Contact: ${user.contact_phone}`);
            log(`  Password Hash: ${passDisplay}`);

            if (user.password && user.password.length > 10) {
                if (await bcrypt.compare('123456', user.password)) log('  [CRITICAL] Password is "123456"');
                if (await bcrypt.compare('password', user.password)) log('  [CRITICAL] Password is "password"');
                if (await bcrypt.compare('admin123', user.password)) log('  [CRITICAL] Password is "admin123"');
            }
        }

        await connection.end();
    } catch (err) {
        log('ERROR: ' + err.message);
    }
}

debugLogin();
