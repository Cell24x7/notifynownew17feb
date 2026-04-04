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
        
        // Add channel, worker_id, updated_at, processed_at to campaign_queue and api_campaign_queue if missing
        try {
            const columns = [
                "channel VARCHAR(20) DEFAULT 'sms'",
                "worker_id VARCHAR(100) DEFAULT NULL",
                "updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
                "processed_at TIMESTAMP NULL DEFAULT NULL"
            ];
            for (const col of columns) {
                await query(`ALTER TABLE campaign_queue ADD COLUMN IF NOT EXISTS ${col}`).catch(() => {});
                await query(`ALTER TABLE api_campaign_queue ADD COLUMN IF NOT EXISTS ${col}`).catch(() => {});
            }

            // Also ensure log tables have the 'error' column
            await query("ALTER TABLE message_logs ADD COLUMN IF NOT EXISTS error TEXT").catch(() => {});
            await query("ALTER TABLE api_message_logs ADD COLUMN IF NOT EXISTS error TEXT").catch(() => {});

            // 🚦 NEW: Ensure sms_gateways has sender_id column
            await query("ALTER TABLE sms_gateways ADD COLUMN IF NOT EXISTS sender_id VARCHAR(20) DEFAULT 'NOTIFY'").catch(() => {});
            
            // 🚦 NEW: Ensure message_templates has DLT columns
            await query("ALTER TABLE message_templates ADD COLUMN IF NOT EXISTS sender VARCHAR(20)").catch(() => {});
            await query("ALTER TABLE message_templates ADD COLUMN IF NOT EXISTS pe_id VARCHAR(50)").catch(() => {});
            await query("ALTER TABLE message_templates ADD COLUMN IF NOT EXISTS hash_id VARCHAR(100)").catch(() => {});

            // Auto-fix Gateway URLs and Headers
            const [gateways] = await query('SELECT id, name, primary_url FROM sms_gateways');
            for (let gw of gateways) {
                let url = gw.primary_url || '';
                let needsUpdate = false;

                // Replace hardcoded NOTIFY with dynamic placeholder
                if (url.includes('from=NOTIFY')) {
                    url = url.replace('from=NOTIFY', 'from=%FROM');
                    needsUpdate = true;
                }

                // Append Error Code placeholder if missing (Kannel specific)
                if (!url.includes('err=') && url.includes('cgi-bin/sendsms')) {
                    url = url.includes('?') ? (url + '&err=%E') : (url + '?err=%E');
                    needsUpdate = true;
                }

                if (needsUpdate) {
                    await query('UPDATE sms_gateways SET primary_url = ? WHERE id = ?', [url, gw.id]).catch(() => {});
                    console.log(`✅ [Maintenance] Corrected URL placeholders for gateway: ${gw.name}`);
                }
            }

            // Force JIO gateway to CMTLTD if it's still on NOTIFY
            await query("UPDATE sms_gateways SET sender_id = 'CMTLTD' WHERE name = 'JIO' AND (sender_id = 'NOTIFY' OR sender_id IS NULL)").catch(() => {});

            console.log('✅ [Maintenance] Database schema synchronized for high-volume engine.');
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
