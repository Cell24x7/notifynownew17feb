const { query } = require('../config/db');

async function runMaintenance() {
    // console.log('🧹 [Maintenance] Starting daily cleanup task...');
    try {
        // Prune webhook_logs only (not detailed message_logs or campaign_data)
        // Keep logs for at least 45 days for debugging
        const [result] = await query(`DELETE FROM webhook_logs WHERE created_at < NOW() - INTERVAL 45 DAY`);
        // console.log(`✅ [Maintenance] Cleaned ${result.affectedRows} old webhook log entries.`);

        // 🛠️ AUTO SCHEMA UPDATES
        // console.log('🔍 [Maintenance] Checking database schema for updates...');
        
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

            // Also ensure log tables have the 'error' and 'metadata' columns
            await query("ALTER TABLE message_logs ADD COLUMN IF NOT EXISTS error TEXT").catch(() => {});
            await query("ALTER TABLE api_message_logs ADD COLUMN IF NOT EXISTS error TEXT").catch(() => {});
            await query("ALTER TABLE message_logs ADD COLUMN IF NOT EXISTS metadata JSON").catch(() => {});
            await query("ALTER TABLE api_message_logs ADD COLUMN IF NOT EXISTS metadata JSON").catch(() => {});

            // 🚦 NEW: Ensure sms_gateways has sender_id column
            await query("ALTER TABLE sms_gateways ADD COLUMN IF NOT EXISTS sender_id VARCHAR(20) DEFAULT 'NOTIFY'").catch(() => {});
            
            // 🚦 FINAL DLT SCHEMA SYNC: Ensure all tables have required columns
            const tablesToFix = ['message_templates', 'campaigns', 'api_campaigns'];
            for (const table of tablesToFix) {
                await query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS sender VARCHAR(20)`).catch(() => {});
                await query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS pe_id VARCHAR(50)`).catch(() => {});
                await query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS hash_id VARCHAR(100)`).catch(() => {});
                await query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS template_id VARCHAR(100)`).catch(() => {});
            }

            // Ensure users table has global SMS settings
            await query("ALTER TABLE users ADD COLUMN IF NOT EXISTS sms_pe_id VARCHAR(50)").catch(() => {});
            await query("ALTER TABLE users ADD COLUMN IF NOT EXISTS sms_default_sender VARCHAR(20)").catch(() => {});

            // Auto-fix Gateway URLs and Headers
            const [gateways] = await query('SELECT id, name, primary_url FROM sms_gateways');
            
            // 🚦 FINAL DLR URL AUTO-CORRECT
            const coreEndpoint = '/api/webhooks/sms/callback';
            for (let gw of gateways) {
                let url = gw.primary_url;
                
                // 1. Ensure Header placeholder is present
                if (url.includes('from=NOTIFY')) url = url.replace('from=NOTIFY', 'from=%FROM');
                
                // 2. Ensure Error code reporting is enabled
                if (!url.includes('err=%E')) url += (url.includes('?') ? '&' : '?') + 'err=%E';

                // 3. Ensure DLR URL is pointed to OUR application with correct params
                // We overwrite any existing dlr-url parameter
                const urlObj = new URL(url);
                
                // Priority: 1. DLR_BASE_URL, 2. API_BASE_URL, 3. Fallback to Localhost
                let baseUrlForDlr = process.env.DLR_BASE_URL || process.env.API_BASE_URL || 'http://localhost:5000';
                
                // CRITICAL: If Kannel doesn't support HTTPS, force HTTP for DLR
                // This often happens when main app is https://notifynow.in but Kannel needs http://IP:PORT
                if (baseUrlForDlr.startsWith('https://') && !process.env.DLR_BASE_URL) {
                    // console.log(`⚠️  [Maintenance] HTTPS detected for API_BASE_URL. Kannel might fail. Suggesting DLR_BASE_URL in .env`);
                }
                
                const finalDlrUrl = `${baseUrlForDlr}${coreEndpoint}?msgid=%MSGID&status=%a&err=%E&mobile=%p`;
                
                // Set the dlr-url param (this will replace if exists)
                urlObj.searchParams.set('dlr-url', finalDlrUrl);
                urlObj.searchParams.set('dlr-mask', '23'); // Standard mask for Deliv, Fail, Reject
                
                const finalUrl = urlObj.toString().replace(/%25/g, '%'); // Decode double encoding if any
                
                if (finalUrl !== gw.primary_url) {
                    await query('UPDATE sms_gateways SET primary_url = ? WHERE id = ?', [finalUrl, gw.id]);
                    // console.log(`✅ [Maintenance] Corrected URL placeholders for gateway: ${gw.name}`);
                }
            }

            // Force JIO gateway to CMTLTD if it's still on NOTIFY
            await query("UPDATE sms_gateways SET sender_id = 'CMTLTD' WHERE name = 'JIO' AND (sender_id = 'NOTIFY' OR sender_id IS NULL)").catch(() => {});
            // console.log('✅ [Maintenance] Database schema synchronized for high-volume engine.');
        } catch (e) { /* console.error('❌ [Maintenance] Could not verify queue columns:', e.message); */ }

        // Also prune api_message_logs older than 90 days to keep performance high
        const [apiResult] = await query(`DELETE FROM api_message_logs WHERE created_at < NOW() - INTERVAL 90 DAY`);
        // console.log(`✅ [Maintenance] Cleaned ${apiResult.affectedRows} old API message logs.`);

    } catch (error) {
        console.error('❌ [Maintenance] Cleanup failed:', error.message);
    }
}

// Start a simple scheduler that runs once every 24 hours
function startMaintenanceService() {
    // console.log('📅 [Maintenance] Service started successfully.');
    
    // Initial run on startup
    runMaintenance();

    // Schedule to run every 24 hours
    setInterval(runMaintenance, 24 * 60 * 60 * 1000); 
}

module.exports = { startMaintenanceService, runMaintenance };
