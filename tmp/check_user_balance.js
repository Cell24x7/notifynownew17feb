const { query } = require('./backend/config/db');
require('dotenv').config({ path: './backend/.env' });

async function checkUser() {
    try {
        const [users] = await query('SELECT id, email, wallet_balance, wa_marketing_price, wa_utility_price, wa_authentication_price FROM users WHERE email = ?', ['dhanlaxmi@gmail.com']);
        console.log('User Data:', users[0]);
        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

checkUser();
