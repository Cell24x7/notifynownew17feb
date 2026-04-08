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
        const res3 = await query("UPDATE campaign_queue SET status = 'pending', processed_at = NULL WHERE status = 'failed' AND (error LIKE ? OR error IS NULL)", [errorPattern]);
        console.log(`🔄 Reset ${res3.affectedRows} failed items in campaign_queue to pending.`);

        const res4 = await query("UPDATE api_campaign_queue SET status = 'pending', processed_at = NULL WHERE status = 'failed' AND (error LIKE ? OR error IS NULL)", [errorPattern]);
        console.log(`🔄 Reset ${res4.affectedRows} failed items in API queue to pending.`);
        
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
