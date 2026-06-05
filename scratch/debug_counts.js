const path = require('path');
const dotenv = require('dotenv');
// Load production env variables
dotenv.config({ path: path.join(__dirname, '../backend/.env.production') });

const { query } = require('../backend/config/db');

async function main() {
    try {
        const [camps] = await query("SELECT id, name, status, recipient_count, sent_count, delivered_count, read_count, failed_count, created_at FROM campaigns WHERE created_at >= '2026-06-05'");
        console.log(`Auditing ${camps.length} campaigns from today:\n`);

        for (const camp of camps) {
            console.log(`\n------------------------------------------------------------`);
            console.log(`Campaign: ${camp.name} (${camp.id}) - Status: ${camp.status}`);
            console.log(`DB Columns   => Recipient: ${camp.recipient_count}, Sent: ${camp.sent_count}, Delivered: ${camp.delivered_count}, Read: ${camp.read_count}, Failed: ${camp.failed_count}`);

            const [queueStats] = await query("SELECT status, COUNT(*) as count FROM campaign_queue WHERE campaign_id = ? GROUP BY status", [camp.id]);
            console.log(`Queue Table  =>`, JSON.stringify(queueStats));

            const [logStats] = await query("SELECT status, COUNT(*) as count FROM message_logs WHERE campaign_id = ? GROUP BY status", [camp.id]);
            console.log(`Logs Table   =>`, JSON.stringify(logStats));
        }

        const [totalPending] = await query("SELECT COUNT(*) as pending FROM campaign_queue WHERE status = 'pending'");
        console.log("\nTotal Global Pending in campaign_queue:", totalPending[0].pending);

    } catch (err) {
        console.error("Error in debug script:", err);
    } finally {
        process.exit(0);
    }
}

main();
