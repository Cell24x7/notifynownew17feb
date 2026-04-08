const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.production') });
const { query } = require('./config/db');

async function cleanupFailedLogs() {
  const errorPattern = "%Template code with bot doesn't exist.%";
  const shouldRetry = process.argv.includes('--retry');
  
  console.log(`🧹 Starting DB ${shouldRetry ? 'RESET & RETRY' : 'CLEANUP'} for 'Template not found' errors...`);

  try {
    // 1. Delete/Update message_logs
    if (!shouldRetry) {
        const res1 = await query("DELETE FROM message_logs WHERE error LIKE ?", [errorPattern]);
        console.log(`✅ Deleted ${res1.affectedRows} records from message_logs.`);

        const res2 = await query("DELETE FROM api_message_logs WHERE error LIKE ?", [errorPattern]);
        console.log(`✅ Deleted ${res2.affectedRows} records from api_message_logs.`);
    } else {
        // Reset Queue items to pending so worker picks them up again
        // We use a JOIN to find items in the queue that failed in the logs with this specific error
        console.log("🔄 Resetting failed items in campaign_queue...");
        const res3 = await query(`
            UPDATE campaign_queue q
            INNER JOIN message_logs l ON q.campaign_id = l.campaign_id AND q.mobile = l.recipient
            SET q.status = 'pending', q.processed_at = NULL
            WHERE l.error LIKE ?
        `, [errorPattern]);
        console.log(`✅ Reset ${res3.affectedRows || 0} items in campaign_queue to pending.`);

        console.log("🔄 Resetting failed items in api_campaign_queue...");
        const res4 = await query(`
            UPDATE api_campaign_queue q
            INNER JOIN api_message_logs l ON q.campaign_id = l.campaign_id AND q.mobile = l.recipient
            SET q.status = 'pending', q.processed_at = NULL
            WHERE l.error LIKE ?
        `, [errorPattern]);
        console.log(`✅ Reset ${res4.affectedRows || 0} items in API queue to pending.`);
        
        // Also clear the failure from logs so reports look clean during retry
        await query("DELETE FROM message_logs WHERE error LIKE ?", [errorPattern]);
        await query("DELETE FROM api_message_logs WHERE error LIKE ?", [errorPattern]);
        console.log(`🧹 Cleared old failure logs to make way for new attempts.`);
    }

    console.log("✨ Cleanup Completed successfully.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Cleanup Failed:", err.message);
    process.exit(1);
  }
}

cleanupFailedLogs();
