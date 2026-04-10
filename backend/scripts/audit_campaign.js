require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.production') });
const { query } = require('../config/db');

async function checkActualData() {
    const campaignNamePattern = '%KXDMN%';
    console.log(`🔍 Investigating Campaign pattern: ${campaignNamePattern}`);

    const [camp] = await query('SELECT id, name, recipient_count, sent_count, failed_count, status FROM campaigns WHERE name LIKE ?', [campaignNamePattern]);
    
    if (camp.length === 0) {
        console.log('❌ Campaign not found.');
        process.exit(0);
    }

    const c = camp[0];
    const campId = c.id;

    console.log(`\n📊 Database Stats for: ${c.name}`);
    console.log(`-----------------------------------`);
    console.log(`Expected Total (from Table): ${c.recipient_count}`);
    console.log(`Sent: ${c.sent_count}`);
    console.log(`Failed: ${c.failed_count}`);
    console.log(`Status: ${c.status}`);

    // Count actual rows in Queue
    const [queueRows] = await query('SELECT COUNT(*) as count FROM campaign_queue WHERE campaign_id = ?', [campId]);
    const [queuePending] = await query('SELECT COUNT(*) as count FROM campaign_queue WHERE campaign_id = ? AND status = "pending"', [campId]);
    const [queueSent] = await query('SELECT COUNT(*) as count FROM campaign_queue WHERE campaign_id = ? AND status = "sent"', [campId]);
    const [queueFailed] = await query('SELECT COUNT(*) as count FROM campaign_queue WHERE campaign_id = ? AND status = "failed"', [campId]);

    console.log(`\n📦 Actual Rows in campaign_queue table:`);
    console.log(`Total Rows: ${queueRows[0].count}`);
    console.log(`Status Sent: ${queueSent[0].count}`);
    console.log(`Status Failed: ${queueFailed[0].count}`);
    console.log(`Status Pending: ${queuePending[0].count}`);

    if (queueRows[0].count < c.recipient_count) {
        console.log(`\n⚠️ ANALYSIS: Database mein sirf ${queueRows[0].count} rows pahuche hain, jabki count ${c.recipient_count} set ho gaya tha.`);
        console.log(`👉 Iska matlab hai ki UPLOAD beech mein hi interrupt ho gaya tha.`);
    } else {
        console.log(`\n✅ Queue rows match the recipient_count.`);
    }

    process.exit(0);
}

checkActualData().catch(err => {
    console.error(err);
    process.exit(1);
});
