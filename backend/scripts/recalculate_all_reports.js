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

let days = 3;
const daysIndex = args.indexOf('--days');
if (daysIndex !== -1 && args[daysIndex + 1]) {
    days = parseInt(args[daysIndex + 1], 10) || 3;
}

async function recalculateManualCampaign(camp) {
    const start = Date.now();
    try {
        const [queueRes] = await query('SELECT COUNT(*) as count FROM campaign_queue WHERE campaign_id = ?', [camp.id]);
        const [logsRes] = await query('SELECT COUNT(DISTINCT recipient) as count FROM message_logs WHERE campaign_id = ?', [camp.id]);
        
        const queueCount = queueRes[0]?.count || 0;
        const logsCount = logsRes[0]?.count || 0;
        
        let total = Math.max(camp.recipient_count || 0, camp.audience_count || 0, queueCount, logsCount);
        
        if (total > (camp.recipient_count || 0)) {
            await query('UPDATE campaigns SET recipient_count = ?, audience_count = ? WHERE id = ?', [total, total, camp.id]);
            camp.recipient_count = total;
            camp.audience_count = total;
        }

        const [statsResult] = await query(`
            SELECT 
                COALESCE(SUM(is_sent), 0) as sent_count,
                COALESCE(SUM(is_delivered), 0) as delivered_count,
                COALESCE(SUM(is_read), 0) as read_count,
                COALESCE(SUM(CASE WHEN is_delivered = 0 AND is_failed = 1 THEN 1 ELSE 0 END), 0) as failed_count
            FROM (
                SELECT recipient,
                       MAX(1) as is_sent,
                       MAX(CASE WHEN status IN ('read', 'displayed', 'read_receipt', 'delivered') THEN 1 ELSE 0 END) as is_delivered,
                       MAX(CASE WHEN status IN ('read', 'displayed', 'read_receipt') THEN 1 ELSE 0 END) as is_read,
                       MAX(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as is_failed
                FROM message_logs
                WHERE campaign_id = ?
                GROUP BY recipient
            ) as t
        `, [camp.id]);

        const stats = statsResult[0];
        
        let sent = Number(stats.sent_count || 0);
        let failed = Number(stats.failed_count || 0);
        const isCompleted = ['sent', 'completed', 'failed'].includes(camp.status?.toLowerCase());

        if (isCompleted && total > 0) {
            const unprocessed = Math.max(0, total - sent);
            sent = total;
            failed = failed + unprocessed;
        } else if (total > 0) {
            sent = Math.min(sent, total);
            failed = Math.min(failed, total);
        }
        let delivered = Math.min(Number(stats.delivered_count || 0), sent);
        let read = Math.min(Number(stats.read_count || 0), delivered);

        await query(
            'UPDATE campaigns SET sent_count = ?, delivered_count = ?, read_count = ?, failed_count = ? WHERE id = ?', 
            [sent, delivered, read, failed, camp.id]
        );
        const duration = Date.now() - start;
        console.log(`✅ Updated Campaign: ${camp.name} (${camp.id}) -> Total: ${total}, Sent: ${sent}, Delivered: ${delivered}, Read: ${read}, Failed: ${failed} (Took ${duration}ms)`);
    } catch (err) {
        console.error(`❌ Error updating manual campaign ${camp.id}:`, err.message);
    }
}

async function recalculateApiCampaign(camp) {
    const start = Date.now();
    try {
        const [queueRes] = await query('SELECT COUNT(*) as count FROM api_campaign_queue WHERE campaign_id = ?', [camp.id]);
        const [logsRes] = await query('SELECT COUNT(DISTINCT recipient) as count FROM api_message_logs WHERE campaign_id = ?', [camp.id]);
        
        const queueCount = queueRes[0]?.count || 0;
        const logsCount = logsRes[0]?.count || 0;
        
        let total = Math.max(camp.recipient_count || 0, camp.audience_count || 0, queueCount, logsCount);
        
        if (total > (camp.recipient_count || 0)) {
            await query('UPDATE api_campaigns SET recipient_count = ?, audience_count = ? WHERE id = ?', [total, total, camp.id]);
            camp.recipient_count = total;
            camp.audience_count = total;
        }

        const [statsResult] = await query(`
            SELECT 
                COALESCE(SUM(is_sent), 0) as sent_count,
                COALESCE(SUM(is_delivered), 0) as delivered_count,
                COALESCE(SUM(is_read), 0) as read_count,
                COALESCE(SUM(CASE WHEN is_delivered = 0 AND is_failed = 1 THEN 1 ELSE 0 END), 0) as failed_count
            FROM (
                SELECT recipient,
                       MAX(1) as is_sent,
                       MAX(CASE WHEN status IN ('read', 'displayed', 'read_receipt', 'delivered') THEN 1 ELSE 0 END) as is_delivered,
                       MAX(CASE WHEN status IN ('read', 'displayed', 'read_receipt') THEN 1 ELSE 0 END) as is_read,
                       MAX(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as is_failed
                FROM api_message_logs
                WHERE campaign_id = ?
                GROUP BY recipient
            ) as t
        `, [camp.id]);

        const stats = statsResult[0];
        
        let sent = Number(stats.sent_count || 0);
        let failed = Number(stats.failed_count || 0);
        const isCompleted = ['sent', 'completed', 'failed'].includes(camp.status?.toLowerCase());

        if (isCompleted && total > 0) {
            const unprocessed = Math.max(0, total - sent);
            sent = total;
            failed = failed + unprocessed;
        } else if (total > 0) {
            sent = Math.min(sent, total);
            failed = Math.min(failed, total);
        }
        let delivered = Math.min(Number(stats.delivered_count || 0), sent);
        let read = Math.min(Number(stats.read_count || 0), delivered);

        await query(
            'UPDATE api_campaigns SET sent_count = ?, delivered_count = ?, read_count = ?, failed_count = ? WHERE id = ?', 
            [sent, delivered, read, failed, camp.id]
        );
        const duration = Date.now() - start;
        console.log(`✅ Updated API Campaign: ${camp.name} (${camp.id}) -> Total: ${total}, Sent: ${sent}, Delivered: ${delivered}, Read: ${read}, Failed: ${failed} (Took ${duration}ms)`);
    } catch (err) {
        console.error(`❌ Error updating API campaign ${camp.id}:`, err.message);
    }
}

async function recalculateReports() {
    if (singleCampaignId) {
        console.log(`🎯 Targeted Recalculation for Campaign ID: ${singleCampaignId}...`);
        
        const [manualCamps] = await query('SELECT id, name, recipient_count, audience_count, status FROM campaigns WHERE id = ?', [singleCampaignId]);
        if (manualCamps.length > 0) {
            await recalculateManualCampaign(manualCamps[0]);
        } else {
            const [apiCamps] = await query('SELECT id, name, recipient_count, audience_count, status FROM api_campaigns WHERE id = ?', [singleCampaignId]);
            if (apiCamps.length > 0) {
                await recalculateApiCampaign(apiCamps[0]);
            } else {
                console.error(`❌ Campaign ${singleCampaignId} not found in database.`);
            }
        }
    } else {
        console.log(`🔍 Starting Batch Recalculation (Last ${days} days or active campaigns)...`);
        
        console.log('--- Processing manual campaigns ---');
        const [manualCamps] = await query(`
            SELECT id, name, recipient_count, audience_count, status 
            FROM campaigns 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY) OR status = 'running'
            ORDER BY created_at DESC
        `, [days]);
        console.log(`Found ${manualCamps.length} recent/running manual campaigns.`);
        for (const camp of manualCamps) {
            await recalculateManualCampaign(camp);
        }

        console.log('\n--- Processing API campaigns ---');
        const [apiCamps] = await query(`
            SELECT id, name, recipient_count, audience_count, status 
            FROM api_campaigns 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY) OR status = 'running'
            ORDER BY created_at DESC
        `, [days]);
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
