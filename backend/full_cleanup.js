const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.production') });
const { query } = require('./config/db');

async function fullCleanup() {
  const errorPattern = "%Template code with bot doesn't exist.%";
  const codePattern = "%409%"; // Also target 409 codes in JSON
  
  console.log(`🧹 Starting Comprehensive Cleanup for "Template code with bot doesn't exist" errors...`);

  try {
    // 1. Target campaigns (Manual)
    console.log("📊 Updating campaigns failed counts...");
    const [failedManual] = await query(`
        SELECT campaign_id, COUNT(*) as count 
        FROM message_logs 
        WHERE (error LIKE ? OR failure_reason LIKE ? OR error LIKE ? OR failure_reason LIKE ?) AND campaign_id IS NOT NULL
        GROUP BY campaign_id
    `, [errorPattern, errorPattern, codePattern, codePattern]);

    for (const item of failedManual) {
        await query("UPDATE campaigns SET failed_count = GREATEST(0, failed_count - ?) WHERE id = ?", [item.count, item.campaign_id]);
        console.log(`  - Updated Campaign ID ${item.campaign_id}: Reduced failed_count by ${item.count}`);
    }

    // 2. Target api_campaigns
    console.log("📊 Updating api_campaigns failed counts...");
    const [failedApi] = await query(`
        SELECT campaign_id, COUNT(*) as count 
        FROM api_message_logs 
        WHERE (error LIKE ? OR failure_reason LIKE ? OR error LIKE ? OR failure_reason LIKE ?) AND campaign_id IS NOT NULL
        GROUP BY campaign_id
    `, [errorPattern, errorPattern, codePattern, codePattern]);

    for (const item of failedApi) {
        await query("UPDATE api_campaigns SET failed_count = GREATEST(0, failed_count - ?) WHERE id = ?", [item.count, item.campaign_id]);
        console.log(`  - Updated API Campaign ID ${item.campaign_id}: Reduced failed_count by ${item.count}`);
    }

    // 3. Delete from message_logs
    const res1 = await query("DELETE FROM message_logs WHERE error LIKE ? OR failure_reason LIKE ? OR error LIKE ? OR failure_reason LIKE ?", [errorPattern, errorPattern, codePattern, codePattern]);
    console.log(`✅ Deleted ${res1.affectedRows} records from message_logs.`);

    // 4. Delete from api_message_logs
    const res2 = await query("DELETE FROM api_message_logs WHERE error LIKE ? OR failure_reason LIKE ? OR error LIKE ? OR failure_reason LIKE ?", [errorPattern, errorPattern, codePattern, codePattern]);
    console.log(`✅ Deleted ${res2.affectedRows} records from api_message_logs.`);

    // 5. Delete from webhook_logs
    const res3 = await query("DELETE FROM webhook_logs WHERE raw_payload LIKE ? OR raw_payload LIKE ?", [errorPattern, codePattern]);
    console.log(`✅ Deleted ${res3.affectedRows} records from webhook_logs.`);

    // 6. Clean up campaign_queue items that match these failures
    const res4 = await query(`
        UPDATE campaign_queue SET status = 'failed_deleted' 
        WHERE (last_error LIKE ? OR last_error LIKE ?) AND status = 'failed'
    `, [errorPattern, codePattern]).catch(() => ({ affectedRows: 0 }));
    console.log(`✅ Marked ${res4.affectedRows || 0} items in campaign_queue as failed_deleted.`);

    console.log("✨ Full Cleanup Completed successfully. Dashboard should now look clean.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Cleanup Failed:", err.message);
    process.exit(1);
  }
}

fullCleanup();
