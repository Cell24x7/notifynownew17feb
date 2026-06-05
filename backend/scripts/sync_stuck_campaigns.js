require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.production') });
const { query } = require('../config/db');

async function syncStuckCampaigns() {
    console.log('🔍 Searching for stuck manual campaigns...');
    
    // Find campaigns that are 'running' but have finished sending tasks to the queue table
    const [runningCampaigns] = await query('SELECT id, name, recipient_count, sent_count FROM campaigns WHERE status = "running"');
    
    for (const camp of runningCampaigns) {
        console.log(`\n📦 Checking Campaign: ${camp.name} (Total: ${camp.recipient_count})`);
        
        // Count how many entries are still "pending" or "processing" for this campaign in the actual queue table
        const [pending] = await query('SELECT COUNT(*) as count FROM campaign_queue WHERE campaign_id = ? AND status IN ("pending", "processing")', [camp.id]);
        
        if (pending[0].count === 0) {
            console.log(`✅ No pending/processing jobs found. Marking as sent.`);
            
            // Recalculate actual sent/failed counts from logs (most accurate)
            const [statsResult] = await query(`
                SELECT 
                    COALESCE(SUM(is_sent), 0) as sent_count,
                    COALESCE(SUM(CASE WHEN is_sent = 0 AND is_failed = 1 THEN 1 ELSE 0 END), 0) as failed_count
                FROM (
                    SELECT recipient,
                           MAX(1) as is_sent,
                           MAX(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as is_failed
                    FROM message_logs
                    WHERE campaign_id = ?
                    GROUP BY recipient
                ) as t
            `, [camp.id]);
            
            const stats = statsResult[0];
            const total = camp.recipient_count || 0;
            let sent = Math.min(stats.sent_count, total);
            let failed = Math.min(stats.failed_count, total);
            
            await query('UPDATE campaigns SET status = "sent", sent_count = ?, failed_count = ? WHERE id = ?', 
                [sent, failed, camp.id]);
            
            console.log(`✨ Fixed status for manual campaign ${camp.name} -> Sent: ${sent}, Failed: ${failed}`);
        } else {
            console.log(`⏳ Still has ${pending[0].count} pending/processing messages. It is actually running.`);
        }
    }
    
    console.log('\n🔍 Searching for stuck API campaigns...');
    const [runningApiCampaigns] = await query('SELECT id, name, recipient_count, sent_count FROM api_campaigns WHERE status = "running"');
    
    for (const camp of runningApiCampaigns) {
        console.log(`\n📦 Checking API Campaign: ${camp.name} (Total: ${camp.recipient_count})`);
        
        const [pending] = await query('SELECT COUNT(*) as count FROM api_campaign_queue WHERE campaign_id = ? AND status IN ("pending", "processing")', [camp.id]);
        
        if (pending[0].count === 0) {
            console.log(`✅ No pending/processing jobs found. Marking as sent.`);
            
            const [statsResult] = await query(`
                SELECT 
                    COALESCE(SUM(is_sent), 0) as sent_count,
                    COALESCE(SUM(CASE WHEN is_sent = 0 AND is_failed = 1 THEN 1 ELSE 0 END), 0) as failed_count
                FROM (
                    SELECT recipient,
                           MAX(1) as is_sent,
                           MAX(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as is_failed
                    FROM api_message_logs
                    WHERE campaign_id = ?
                    GROUP BY recipient
                ) as t
            `, [camp.id]);
            
            const stats = statsResult[0];
            const total = camp.recipient_count || 0;
            let sent = Math.min(stats.sent_count, total);
            let failed = Math.min(stats.failed_count, total);
            
            await query('UPDATE api_campaigns SET status = "sent", sent_count = ?, failed_count = ? WHERE id = ?', 
                [sent, failed, camp.id]);
            
            console.log(`✨ Fixed status for API campaign ${camp.name} -> Sent: ${sent}, Failed: ${failed}`);
        } else {
            console.log(`⏳ Still has ${pending[0].count} pending/processing messages. It is actually running.`);
        }
    }
    
    console.log('\n✅ Sync complete.');
    process.exit(0);
}

syncStuckCampaigns().catch(err => {
    console.error(err);
    process.exit(1);
});
