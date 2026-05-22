require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.production') });
const { query } = require('../config/db');

async function syncStuckCampaigns() {
    console.log('🔍 Searching for stuck campaigns...');
    
    // Find campaigns that are 'running' but have finished sending tasks to the queue table
    const [runningCampaigns] = await query('SELECT id, name, recipient_count, sent_count FROM campaigns WHERE status = "running"');
    
    for (const camp of runningCampaigns) {
        console.log(`\n📦 Checking Campaign: ${camp.name} (Total: ${camp.recipient_count})`);
        
        // Count how many entries are still "pending" for this campaign in the actual queue table
        const [pending] = await query('SELECT COUNT(*) as count FROM campaign_queue WHERE campaign_id = ? AND status = "pending"', [camp.id]);
        
        if (pending[0].count === 0) {
            console.log(`✅ No pending jobs found. Marking as sent.`);
            
            // Recalculate actual sent/failed counts from logs (most accurate)
            const [statsResult] = await query(`
                SELECT 
                    COALESCE(SUM(is_sent), 0) as sent_count,
                    COALESCE(SUM(CASE WHEN is_sent = 0 AND is_failed = 1 THEN 1 ELSE 0 END), 0) as failed_count
                FROM (
                    SELECT recipient,
                           MAX(CASE WHEN status IN ('read', 'displayed', 'read_receipt', 'delivered', 'sent', 'submitted', 'success') OR (status = 'failed' AND message_id IS NOT NULL AND message_id != '' AND message_id != 'N/A') THEN 1 ELSE 0 END) as is_sent,
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
            
            console.log(`✨ Fixed status for ${camp.name}`);
        } else {
            console.log(`⏳ Still has ${pending[0].count} pending messages. It is actually running.`);
        }
    }
    
    console.log('\n✅ Sync complete.');
    process.exit(0);
}

syncStuckCampaigns().catch(err => {
    console.error(err);
    process.exit(1);
});
