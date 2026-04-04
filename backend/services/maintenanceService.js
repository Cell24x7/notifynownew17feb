const { query } = require('../config/db');

async function runMaintenance() {
    console.log('🧹 [Maintenance] Starting daily cleanup task...');
    try {
        // Prune webhook_logs only (not detailed message_logs or campaign_data)
        // Keep logs for at least 45 days for debugging
        const [result] = await query(`DELETE FROM webhook_logs WHERE created_at < NOW() - INTERVAL 45 DAY`);
        console.log(`✅ [Maintenance] Cleaned ${result.affectedRows} old webhook log entries.`);

        // 🛠️ AUTO SCHEMA UPDATES
        console.log('🔍 [Maintenance] Checking database schema for updates...');
        
        // Add channel and worker_id to campaign_queue and api_campaign_queue if missing
        try {
            await query("ALTER TABLE campaign_queue ADD COLUMN IF NOT EXISTS channel VARCHAR(20) DEFAULT 'sms'");
            await query("ALTER TABLE campaign_queue ADD COLUMN IF NOT EXISTS worker_id VARCHAR(100) DEFAULT NULL");
            await query("ALTER TABLE api_campaign_queue ADD COLUMN IF NOT EXISTS channel VARCHAR(20) DEFAULT 'sms'");
            await query("ALTER TABLE api_campaign_queue ADD COLUMN IF NOT EXISTS worker_id VARCHAR(100) DEFAULT NULL");
            console.log('✅ [Maintenance] Verified `channel` and `worker_id` columns in queue tables');
        } catch (e) { console.error('❌ [Maintenance] Could not verify queue columns:', e.message); }

        // Also prune api_message_logs older than 90 days to keep performance high
        const [apiResult] = await query(`DELETE FROM api_message_logs WHERE created_at < NOW() - INTERVAL 90 DAY`);
        console.log(`✅ [Maintenance] Cleaned ${apiResult.affectedRows} old API message logs.`);

    } catch (error) {
        console.error('❌ [Maintenance] Cleanup failed:', error.message);
    }
}

// Start a simple scheduler that runs once every 24 hours
function startMaintenanceService() {
    console.log('📅 [Maintenance] Service started successfully.');
    
    // Initial run on startup
    runMaintenance();

    // Schedule to run every 24 hours
    setInterval(runMaintenance, 24 * 60 * 60 * 1000); 
}

module.exports = { startMaintenanceService, runMaintenance };
