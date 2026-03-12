
require('dotenv').config({ path: './.env' });
const { query } = require('./config/db');

async function check() {
    try {
        const [rows] = await query("SELECT id, user_id, message_content, type FROM webhook_logs ORDER BY created_at DESC LIMIT 10");
        console.log("Recent Webhook Logs:");
        console.table(rows);
        
        const [rows2] = await query("SELECT * FROM chat_flows WHERE name LIKE 'TGE%'");
        console.log("TGE Flows:");
        rows2.forEach(r => console.log(`${r.id} - ${r.name} - ${r.status} - keywords: ${r.keywords}`));
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}
check();
