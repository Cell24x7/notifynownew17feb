require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { query } = require('./config/db');

async function check() {
    try {
        console.log('--- Fetching User ID 1 Details ---');
        const [users] = await query('SELECT id, email, api_key, wallet_balance FROM users WHERE id = 1');
        console.log('User:', JSON.stringify(users, null, 2));

        console.log('\n--- Fetching Available SMS Templates for User 1 ---');
        const [templates] = await query('SELECT name, body, metadata FROM message_templates WHERE user_id = 1 LIMIT 3');
        console.log('Templates:', JSON.stringify(templates, null, 2));

        process.exit(0);
    } catch (e) {
        process.exit(1);
    }
}
check();
