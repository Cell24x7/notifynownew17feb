require('./backend/node_modules/dotenv').config({ path: require('path').join(__dirname, 'backend', '.env') });
const { query } = require('./backend/config/db');

async function checkLogs() {
    try {
        const [logs] = await query(
            "SELECT id, user_id, sender, recipient, message_content, channel, status, raw_payload, created_at FROM webhook_logs ORDER BY id DESC LIMIT 10"
        );
        console.log("=== LATEST 10 WEBHOOK LOGS ===");
        console.log(JSON.stringify(logs, null, 2));

        const [msgLogs] = await query(
            "SELECT id, campaign_id, recipient, status, delivery_time, read_time, failure_reason, updated_at FROM message_logs WHERE user_id = 57 ORDER BY id DESC LIMIT 5"
        );
        console.log("=== LATEST MESSAGE LOGS FOR USER 57 ===");
        console.log(JSON.stringify(msgLogs, null, 2));

        process.exit(0);
    } catch (err) {
        console.error("DB Query Error:", err);
        process.exit(1);
    }
}

checkLogs();
