require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.production') });
const { query } = require('../config/db');

async function recalculateReports() {
    console.log('🔍 Starting Recalculation of All Campaign Reports (Removing Duplicates)...');
    
    // Get all campaigns
    const [campaigns] = await query('SELECT id, name, recipient_count FROM campaigns ORDER BY created_at DESC LIMIT 500');
    
    for (const camp of campaigns) {
        // Count distinct recipients for each status
        const [sentRes] = await query('SELECT COUNT(DISTINCT recipient) as count FROM message_logs WHERE campaign_id = ?', [camp.id]);
        const [delivRes] = await query('SELECT COUNT(DISTINCT recipient) as count FROM message_logs WHERE campaign_id = ? AND status IN ("delivered", "read", "displayed")', [camp.id]);
        const [readRes] = await query('SELECT COUNT(DISTINCT recipient) as count FROM message_logs WHERE campaign_id = ? AND status IN ("read", "displayed")', [camp.id]);
        const [failedRes] = await query('SELECT COUNT(DISTINCT recipient) as count FROM message_logs WHERE campaign_id = ? AND status = "failed"', [camp.id]);
        
        let sent = sentRes[0].count;
        let delivered = delivRes[0].count;
        let read = readRes[0].count;
        let failed = failedRes[0].count;
        
        // Safety cap: Sent count cannot exceed recipient count in reports
        if (sent > camp.recipient_count) {
            sent = camp.recipient_count;
        }
        
        // Update campaigns table
        await query(
            'UPDATE campaigns SET sent_count = ?, delivered_count = ?, read_count = ?, failed_count = ? WHERE id = ?', 
            [sent, delivered, read, failed, camp.id]
        );
        
        console.log(`✅ Updated ${camp.name} -> Sent: ${sent}, Delivered: ${delivered}, Failed: ${failed}`);
    }
    
    console.log('\n🎉 Recalculation Complete!');
    process.exit(0);
}

recalculateReports().catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
});
