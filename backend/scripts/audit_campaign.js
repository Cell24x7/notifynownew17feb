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

    // Count ALL statuses in Queue
    const [statusCounts] = await query('SELECT status, COUNT(*) as count FROM campaign_queue WHERE campaign_id = ? GROUP BY status', [campId]);
    
    console.log(`\n📦 Breakdown of rows in campaign_queue table:`);
    statusCounts.forEach(row => {
        console.log(`Status "${row.status}": ${row.count}`);
    });

    // Check message_logs for actual truth
    const [logStats] = await query('SELECT status, COUNT(*) as count FROM message_logs WHERE campaign_id = ? GROUP BY status', [campId]);
    console.log(`\n📄 Actual Truth from message_logs:`);
    let actualDelivered = 0;
    let actualFailed = 0;
    let actualSent = 0;

    logStats.forEach(row => {
        console.log(`Log Status "${row.status}": ${row.count}`);
        if (row.status === 'delivered') actualDelivered += row.count;
        if (row.status === 'sent') actualSent += row.count;
        if (row.status === 'failed') actualFailed += row.count;
    });

    console.log(`\n🛠 REPAIRING COUNTERS...`);
    // Rule: Total processed should never exceed recipient_count
    // We update campaigns table with counts from message_logs (The Source of Truth)
    const totalSent = actualSent + actualDelivered; // Total attempted
    
    await query('UPDATE campaigns SET sent_count = ?, delivered_count = ?, failed_count = ?, status = "sent" WHERE id = ?', 
        [totalSent, actualDelivered, actualFailed, campId]);

    console.log(`\n🛠 RESCUING STUCK JOBS...`);
    const [rescueResult] = await query('UPDATE campaign_queue SET status = "pending" WHERE campaign_id = ? AND status = "processing"', [campId]);
    console.log(`✅ Rescued ${rescueResult.affectedRows} messages from "processing" state. They will be sent soon.`);

    process.exit(0);
}

checkActualData().catch(err => {
    console.error(err);
    process.exit(1);
});
