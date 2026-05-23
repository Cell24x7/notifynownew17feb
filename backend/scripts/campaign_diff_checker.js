#!/usr/bin/env node
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Load appropriate env config
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
dotenv.config({ path: path.join(__dirname, '..', envFile) });

const { query } = require('../config/db');

// Ensure reports directory exists
const reportsDir = path.join(__dirname, '..', 'reports');
if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
}

async function run() {
    const args = process.argv.slice(2);
    const campaignId = args[0];

    if (!campaignId) {
        console.error('\n❌ Error: Please provide a Campaign ID.');
        console.error('Usage: node backend/scripts/campaign_diff_checker.js <campaign_id>\n');
        process.exit(1);
    }

    console.log(`\n🔎 Investigating Campaign ID: ${campaignId} in database...`);

    try {
        // 1. Fetch Campaign details
        let isApiCampaign = false;
        let [camp] = await query('SELECT id, name, recipient_count, sent_count, delivered_count, read_count, failed_count, status, channel FROM campaigns WHERE id = ?', [campaignId]);
        
        if (camp.length === 0) {
            // Check api_campaigns
            [camp] = await query('SELECT id, name, recipient_count, sent_count, delivered_count, read_count, failed_count, status, channel FROM api_campaigns WHERE id = ?', [campaignId]);
            if (camp.length === 0) {
                console.error(`❌ Error: Campaign with ID ${campaignId} not found in campaigns or api_campaigns tables.`);
                process.exit(1);
            }
            isApiCampaign = true;
        }

        const c = camp[0];
        console.log(`\n========================================================================`);
        console.log(`📋 Campaign: "${c.name}" (ID: ${c.id}) [Type: ${isApiCampaign ? 'API' : 'Manual'}]`);
        console.log(`========================================================================`);
        console.log(`• Target Base (Total):   ${Number(c.recipient_count || 0).toLocaleString()}`);
        console.log(`• Sent Count (Table):    ${Number(c.sent_count || 0).toLocaleString()}`);
        console.log(`• Delivered (Table):     ${Number(c.delivered_count || 0).toLocaleString()}`);
        console.log(`• Read (Table):          ${Number(c.read_count || 0).toLocaleString()}`);
        console.log(`• Failed (Table):        ${Number(c.failed_count || 0).toLocaleString()}`);
        console.log(`• Channel:               ${c.channel}`);
        console.log(`• Status:                ${c.status.toUpperCase()}`);
        console.log(`------------------------------------------------------------------------`);

        // 2. Fetch all message logs for this campaign
        const [logs] = await query(
            'SELECT recipient, channel, status, error_code, error_message FROM message_logs WHERE campaign_id = ?',
            [campaignId]
        );

        // Map status counts from logs
        const logMap = {};
        const logsSentNumbers = new Set();
        const logsDeliveredNumbers = new Set();
        const logsFailedNumbers = new Set();
        const logsReadNumbers = new Set();

        logs.forEach(l => {
            const rawNum = String(l.recipient).replace(/\D/g, '');
            const stat = (l.status || '').toLowerCase();
            logMap[rawNum] = stat;

            if (stat === 'read' || stat === 'displayed' || stat === 'read_receipt') {
                logsReadNumbers.add(rawNum);
                logsDeliveredNumbers.add(rawNum);
                logsSentNumbers.add(rawNum);
            } else if (stat === 'delivered') {
                logsDeliveredNumbers.add(rawNum);
                logsSentNumbers.add(rawNum);
            } else if (stat === 'failed') {
                logsFailedNumbers.add(rawNum);
            } else {
                // Sent / Submitted
                logsSentNumbers.add(rawNum);
            }
        });

        // 3. Fetch all numbers in the campaign queue
        const queueTable = isApiCampaign ? 'api_campaign_queue' : 'campaign_queue';
        const [queue] = await query(
            `SELECT mobile, status FROM ${queueTable} WHERE campaign_id = ?`,
            [campaignId]
        );

        const queueNumbers = queue.map(q => String(q.mobile).replace(/\D/g, ''));

        // 4. Analysis

        // A. Skipped Numbers: Uploaded in queue but never got recorded in message_logs
        const skippedNumbers = [];
        queue.forEach(q => {
            const rawNum = String(q.mobile).replace(/\D/g, '');
            if (!logMap[rawNum]) {
                skippedNumbers.push({
                    number: rawNum,
                    queueStatus: q.status
                });
            }
        });

        // B. Pending DLR Numbers: in message_logs with status 'sent' (not delivered/read/failed)
        const pendingDlrNumbers = [];
        logs.forEach(l => {
            const rawNum = String(l.recipient).replace(/\D/g, '');
            const stat = (l.status || '').toLowerCase();
            if (stat === 'sent' || stat === 'submitted' || stat === 'success') {
                pendingDlrNumbers.push(rawNum);
            }
        });

        // Dedup pending
        const uniquePending = [...new Set(pendingDlrNumbers)];

        console.log(`\n🔍 CAMPAIGN LOGS & QUEUE COMPARISON ANALYSIS:`);
        console.log(`------------------------------------------------------------------------`);
        console.log(`1. Total Numbers in Queue Table:   ${queue.length.toLocaleString()}`);
        console.log(`2. Total Sent Records in Logs:     ${logsSentNumbers.size.toLocaleString()}`);
        console.log(`3. Total Delivered in Logs (DLR):  ${logsDeliveredNumbers.size.toLocaleString()} (Includes Read)`);
        console.log(`4. Total Read in Logs:             ${logsReadNumbers.size.toLocaleString()}`);
        console.log(`5. Total Failed in Logs:           ${logsFailedNumbers.size.toLocaleString()}`);
        console.log(`------------------------------------------------------------------------`);
        console.log(`📈 DIFFERENCE BREAKDOWN:`);
        console.log(`------------------------------------------------------------------------`);
        console.log(`🔴 SKIPPED NUMBERS:         ${skippedNumbers.length.toLocaleString()} numbers`);
        console.log(`   (Uploaded in excel/list but never attempted or got filtered out due to duplicates/invalid format)`);
        console.log(`🟡 DLR PENDING (Sent Only):  ${uniquePending.length.toLocaleString()} numbers`);
        console.log(`   (Submitted to gateway but waiting for delivery receipt from carrier/handset offline)`);
        console.log(`🟢 ATTEMPTED & COMPLETED:   ${(logsDeliveredNumbers.size + logsFailedNumbers.size).toLocaleString()} numbers`);
        console.log(`   (Either delivered, read, or permanently failed)`);
        console.log(`========================================================================`);

        // Save detailed results to reports
        if (skippedNumbers.length > 0) {
            const skippedFile = path.join(reportsDir, `campaign_${campaignId}_skipped.txt`);
            const content = skippedNumbers.map(s => `${s.number} (Queue Status: ${s.queueStatus})`).join('\n');
            fs.writeFileSync(skippedFile, content, 'utf8');
            console.log(`\n💾 Saved list of SKIPPED numbers to: reports/campaign_${campaignId}_skipped.txt`);
        }

        if (uniquePending.length > 0) {
            const pendingFile = path.join(reportsDir, `campaign_${campaignId}_pending.txt`);
            const content = uniquePending.join('\n');
            fs.writeFileSync(pendingFile, content, 'utf8');
            console.log(`💾 Saved list of PENDING DLR numbers to: reports/campaign_${campaignId}_pending.txt`);
        }

        console.log(`\n✅ Analysis complete.\n`);
        process.exit(0);

    } catch (err) {
        console.error('\n❌ Database Query Error:', err.message);
        process.exit(1);
    }
}

run();
