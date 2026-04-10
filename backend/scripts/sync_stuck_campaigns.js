require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.production') });
const { query } = require('../config/db');

async function syncStuckCampaigns() {
    console.log('🔍 Searching for stuck campaigns...');
    
    // Find campaigns that are 'running' but have finished sending tasks to the queue table
    const [runningCampaigns] = await query('SELECT id, name, total_count, sent_count FROM campaigns WHERE status = "running"');
    
    for (const camp of runningCampaigns) {
        console.log(`\n📦 Checking Campaign: ${camp.name} (Total: ${camp.total_count})`);
        
        // Count how many entries are still "pending" for this campaign in the actual queue table
        const [pending] = await query('SELECT COUNT(*) as count FROM campaign_queue WHERE campaign_id = ? AND status = "pending"', [camp.id]);
        
        if (pending[0].count === 0) {
            console.log(`✅ No pending jobs found. Marking as sent.`);
            
            // Recalculate actual sent/failed counts from logs (most accurate)
            const [logs] = await query('SELECT COUNT(*) as sent FROM message_logs WHERE campaign_id = ?', [camp.id]);
            const [failed] = await query('SELECT COUNT(*) as failed FROM message_logs WHERE campaign_id = ? AND status = "failed"', [camp.id]);
            
            await query('UPDATE campaigns SET status = "sent", sent_count = ?, failed_count = ? WHERE id = ?', 
                [logs[0].sent, failed[0].failed, camp.id]);
            
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
