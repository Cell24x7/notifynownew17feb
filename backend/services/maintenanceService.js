const { query } = require('../config/db');

async function runMaintenance() {
    console.log('🧹 [Maintenance] Starting daily cleanup task...');
    try {
        // Prune webhook_logs only (not detailed message_logs or campaign_data)
        // Keep logs for at least 45 days for debugging
        const [result] = await query(`DELETE FROM webhook_logs WHERE created_at < NOW() - INTERVAL 45 DAY`);
        console.log(`✅ [Maintenance] Cleaned ${result.affectedRows} old webhook log entries.`);

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
    
    // Initial run on startup (optional, let's wait 1 minute for system to be stable)
    setTimeout(runMaintenance, 60000);

    // Schedule to run every 24 hours
    setInterval(runMaintenance, 24 * 60 * 60 * 1000); 
}

module.exports = { startMaintenanceService, runMaintenance };
