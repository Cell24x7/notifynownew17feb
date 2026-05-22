const path = require('path');
const dotenv = require('dotenv');

// Smart env loading: respect NODE_ENV or default to .env.production on live server
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
dotenv.config({ path: path.join(__dirname, '..', envFile) });

const { query } = require('../config/db');

// Parse command line arguments
const args = process.argv.slice(2);
let singleCampaignId = null;
const campaignIndex = args.indexOf('--campaign');
if (campaignIndex !== -1 && args[campaignIndex + 1]) {
    singleCampaignId = args[campaignIndex + 1];
}

async function recalculateManualCampaign(camp) {
    const start = Date.now();
    try {
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
        const duration = Date.now() - start;
        console.log(`✅ Updated Campaign: ${camp.name} (${camp.id}) -> Sent: ${sent}, Delivered: ${delivered}, Read: ${read}, Failed: ${failed} (Took ${duration}ms)`);
    } catch (err) {
        console.error(`❌ Error updating manual campaign ${camp.id}:`, err.message);
    }
}

async function recalculateApiCampaign(camp) {
    const start = Date.now();
    try {
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
        const duration = Date.now() - start;
        console.log(`✅ Updated API Campaign: ${camp.name} (${camp.id}) -> Sent: ${sent}, Delivered: ${delivered}, Read: ${read}, Failed: ${failed} (Took ${duration}ms)`);
    } catch (err) {
        console.error(`❌ Error updating API campaign ${camp.id}:`, err.message);
    }
}

async function recalculateReports() {
    if (singleCampaignId) {
        console.log(`🎯 Targeted Recalculation for Campaign ID: ${singleCampaignId}...`);
        
        const [manualCamps] = await query('SELECT id, name, recipient_count, audience_count FROM campaigns WHERE id = ?', [singleCampaignId]);
        if (manualCamps.length > 0) {
            await recalculateManualCampaign(manualCamps[0]);
        } else {
            const [apiCamps] = await query('SELECT id, name, recipient_count, audience_count FROM api_campaigns WHERE id = ?', [singleCampaignId]);
            if (apiCamps.length > 0) {
                await recalculateApiCampaign(apiCamps[0]);
            } else {
                console.error(`❌ Campaign ${singleCampaignId} not found in database.`);
            }
        }
    } else {
        console.log('🔍 Starting Batch Recalculation (Last 14 days or active campaigns)...');
        
        console.log('--- Processing manual campaigns ---');
        const [manualCamps] = await query(`
            SELECT id, name, recipient_count, audience_count 
            FROM campaigns 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 14 DAY) OR status = 'running'
            ORDER BY created_at DESC
        `);
        console.log(`Found ${manualCamps.length} recent/running manual campaigns.`);
        for (const camp of manualCamps) {
            await recalculateManualCampaign(camp);
        }

        console.log('\n--- Processing API campaigns ---');
        const [apiCamps] = await query(`
            SELECT id, name, recipient_count, audience_count 
            FROM api_campaigns 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 14 DAY) OR status = 'running'
            ORDER BY created_at DESC
        `);
        console.log(`Found ${apiCamps.length} recent/running API campaigns.`);
        for (const camp of apiCamps) {
            await recalculateApiCampaign(camp);
        }
    }
    
    console.log('\n🎉 Recalculation Complete!');
    process.exit(0);
}

recalculateReports().catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
});
