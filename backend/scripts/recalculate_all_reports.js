require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.production') });
const { query } = require('../config/db');

async function recalculateReports() {
    console.log('🔍 Starting Recalculation of All Campaign Reports (Removing Duplicates)...');
    
    // 1. Recalculate campaigns (Normal)
    console.log('--- Processing normal campaigns ---');
    const [campaigns] = await query('SELECT id, name, recipient_count, audience_count FROM campaigns ORDER BY created_at DESC LIMIT 500');
    for (const camp of campaigns) {
        const [statsResult] = await query(`
            SELECT 
                COALESCE(SUM(CASE WHEN best_weight >= 1 THEN 1 ELSE 0 END), 0) as sent_count,
                COALESCE(SUM(CASE WHEN best_weight >= 2 THEN 1 ELSE 0 END), 0) as delivered_count,
                COALESCE(SUM(CASE WHEN best_weight = 3 THEN 1 ELSE 0 END), 0) as read_count,
                COALESCE(SUM(CASE WHEN best_weight = 0 THEN 1 ELSE 0 END), 0) as failed_count
            FROM (
                SELECT recipient,
                       MAX(CASE 
                           WHEN status IN ('read', 'displayed', 'read_receipt') THEN 3
                           WHEN status = 'delivered' THEN 2
                           WHEN status IN ('sent', 'submitted', 'success') THEN 1
                           ELSE 0
                       END) as best_weight
                FROM message_logs
                WHERE campaign_id = ?
                GROUP BY recipient
            ) as t
        `, [camp.id]);

        const stats = statsResult[0];
        const total = camp.recipient_count || camp.audience_count || 0;
        
        let sent = stats.sent_count;
        let failed = stats.failed_count;
        if (total > 0) {
            sent = Math.min(sent, total);
            failed = Math.min(failed, total - sent);
        }
        let delivered = Math.min(stats.delivered_count, sent);
        let read = Math.min(stats.read_count, delivered);

        await query(
            'UPDATE campaigns SET sent_count = ?, delivered_count = ?, read_count = ?, failed_count = ? WHERE id = ?', 
            [sent, delivered, read, failed, camp.id]
        );
        console.log(`✅ Updated Campaign ${camp.name} (${camp.id}) -> Sent: ${sent}, Delivered: ${delivered}, Read: ${read}, Failed: ${failed}`);
    }

    // 2. Recalculate api_campaigns
    console.log('\n--- Processing API campaigns ---');
    const [apiCampaigns] = await query('SELECT id, name, recipient_count, audience_count FROM api_campaigns ORDER BY created_at DESC LIMIT 500');
    for (const camp of apiCampaigns) {
        const [statsResult] = await query(`
            SELECT 
                COALESCE(SUM(CASE WHEN best_weight >= 1 THEN 1 ELSE 0 END), 0) as sent_count,
                COALESCE(SUM(CASE WHEN best_weight >= 2 THEN 1 ELSE 0 END), 0) as delivered_count,
                COALESCE(SUM(CASE WHEN best_weight = 3 THEN 1 ELSE 0 END), 0) as read_count,
                COALESCE(SUM(CASE WHEN best_weight = 0 THEN 1 ELSE 0 END), 0) as failed_count
            FROM (
                SELECT recipient,
                       MAX(CASE 
                           WHEN status IN ('read', 'displayed', 'read_receipt') THEN 3
                           WHEN status = 'delivered' THEN 2
                           WHEN status IN ('sent', 'submitted', 'success') THEN 1
                           ELSE 0
                       END) as best_weight
                FROM api_message_logs
                WHERE campaign_id = ?
                GROUP BY recipient
            ) as t
        `, [camp.id]);

        const stats = statsResult[0];
        const total = camp.recipient_count || camp.audience_count || 0;
        
        let sent = stats.sent_count;
        let failed = stats.failed_count;
        if (total > 0) {
            sent = Math.min(sent, total);
            failed = Math.min(failed, total - sent);
        }
        let delivered = Math.min(stats.delivered_count, sent);
        let read = Math.min(stats.read_count, delivered);

        await query(
            'UPDATE api_campaigns SET sent_count = ?, delivered_count = ?, read_count = ?, failed_count = ? WHERE id = ?', 
            [sent, delivered, read, failed, camp.id]
        );
        console.log(`✅ Updated API Campaign ${camp.name} (${camp.id}) -> Sent: ${sent}, Delivered: ${delivered}, Read: ${read}, Failed: ${failed}`);
    }
    
    console.log('\n🎉 Recalculation Complete!');
    process.exit(0);
}

recalculateReports().catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
});
