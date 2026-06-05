const path = require('path');
const dotenv = require('dotenv');
// Load production env variables
dotenv.config({ path: path.join(__dirname, '.env.production') });

const { query } = require('./config/db');

async function main() {
    try {
        const campaignIds = ['CAMP1780645722873', 'CAMP1780647401207'];
        for (const cid of campaignIds) {
            console.log(`\n=================== DEBUGGING CAMPAIGN: ${cid} ===================`);
            const [camps] = await query("SELECT id, name, status, recipient_count, sent_count, failed_count, created_at FROM campaigns WHERE id = ?", [cid]);
            console.log("Campaign details:", camps[0]);

            const [queueStats] = await query("SELECT status, COUNT(*) as count FROM campaign_queue WHERE campaign_id = ? GROUP BY status", [cid]);
            console.log("Queue Stats in campaign_queue:", queueStats);

            const [logStats] = await query("SELECT status, COUNT(*) as count FROM message_logs WHERE campaign_id = ? GROUP BY status", [cid]);
            console.log("Message Logs Stats in message_logs:", logStats);
        }

        // Check overall pending queue count
        const [totalPending] = await query("SELECT COUNT(*) as pending FROM campaign_queue WHERE status = 'pending'");
        console.log("\nTotal Pending in campaign_queue:", totalPending[0].pending);

    } catch (err) {
        console.error("Error in debug script:", err);
    } finally {
        process.exit(0);
    }
}

main();
