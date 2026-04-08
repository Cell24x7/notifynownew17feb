const { query } = require('./config/db');

async function cleanupFailedLogs() {
  const errorPattern = "%Template code with bot doesn't exist.%";
  
  console.log("🧹 Starting DB Cleanup for 'Template not found' errors...");

  try {
    // 1. Delete from message_logs
    const res1 = await query("DELETE FROM message_logs WHERE error LIKE ?", [errorPattern]);
    console.log(`✅ Deleted ${res1.affectedRows} records from message_logs.`);

    // 2. Delete from api_message_logs
    const res2 = await query("DELETE FROM api_message_logs WHERE error LIKE ?", [errorPattern]);
    console.log(`✅ Deleted ${res2.affectedRows} records from api_message_logs.`);

    // 3. Optional: Reset queue items to 'pending' if you want to retry them
    // const res3 = await query("UPDATE campaign_queue SET status = 'pending' WHERE status = 'failed' AND error LIKE ?", [errorPattern]);
    // console.log(`🔄 Reset ${res3.affectedRows} failed items in campaign_queue to pending.`);

    console.log("✨ Cleanup Completed successfully.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Cleanup Failed:", err.message);
    process.exit(1);
  }
}

cleanupFailedLogs();
