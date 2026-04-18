const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.production') });
const { query } = require('../config/db');

async function check() {
    console.log('--- USER CHECK ---');
    const [users] = await query('SELECT id, email, username FROM users WHERE email LIKE "notify%" OR username LIKE "notify%"');
    console.table(users);

    console.log('\n--- RECENT CLICK LOGS ---');
    const [clicks] = await query('SELECT id, user_id, mobile, original_url, click_count, last_clicked_at FROM link_clicks ORDER BY id DESC LIMIT 5');
    console.table(clicks);

    console.log('\n--- WEBHOOK LOGS FOR RECENT CLICKS ---');
    if (clicks.length > 0) {
        const mobiles = clicks.map(c => c.mobile);
        const [logs] = await query('SELECT * FROM webhook_logs WHERE sender IN (?) OR recipient IN (?) ORDER BY id DESC LIMIT 10', [mobiles, mobiles]);
        console.table(logs.map(l => ({ id: l.id, user: l.user_id, sender: l.sender, recipient: l.recipient, msg: l.message_content.substring(0, 30) })));
    }

    process.exit(0);
}

check().catch(err => {
    console.error(err);
    process.exit(1);
});
