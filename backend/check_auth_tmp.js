require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { query } = require('./config/db');
const bcrypt = require('bcryptjs');

async function check() {
    try {
        const email = 'demo@gmail.com';
        const [users] = await query('SELECT id, email, api_password, status, api_key FROM users WHERE email = ?', [email]);
        console.log('User found:', JSON.stringify(users, null, 2));

        if (users.length > 0) {
            const providedPwd = 'apidemo2025';
            const hashedPwd = users[0].api_password;
            console.log('Hashed PWD in DB:', hashedPwd);
            if (hashedPwd) {
                const match = await bcrypt.compare(providedPwd, hashedPwd);
                console.log('Bcrypt Match:', match);
            } else {
                console.log('No api_password set for this user.');
            }
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
