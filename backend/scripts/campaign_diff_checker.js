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
    const input = args.join(' ').trim();

    if (!input) {
        console.error('\n❌ Error: Please provide a Campaign ID or Campaign Name.');
        console.error('Usage: node backend/scripts/campaign_diff_checker.js <campaign_id_or_name>\n');
        process.exit(1);
    }

    let campaignId = null;
    let isApiCampaign = false;
    let c = null;

    try {
        // A. Try parsing input as numerical campaign ID first
        if (/^\d+$/.test(input)) {
            campaignId = parseInt(input, 10);
            let [camp] = await query('SELECT id, name, recipient_count, sent_count, delivered_count, read_count, failed_count, status, channel FROM campaigns WHERE id = ?', [campaignId]);
            if (camp.length > 0) {
                c = camp[0];
                isApiCampaign = false;
            } else {
                [camp] = await query('SELECT id, name, recipient_count, sent_count, delivered_count, read_count, failed_count, status, channel FROM api_campaigns WHERE id = ?', [campaignId]);
                if (camp.length > 0) {
                    c = camp[0];
                    isApiCampaign = true;
                }
            }
        }

        // B. If not found by ID, try searching as a campaign name pattern
        if (!c) {
            console.log(`🔍 Searching campaigns matching name pattern: "%${input}%"...`);
            const [campMatches] = await query(
                'SELECT id, name, recipient_count, sent_count, delivered_count, read_count, failed_count, status, channel, created_at, "manual" as type FROM campaigns WHERE name LIKE ?',
                [`%${input}%`]
            );
            const [apiMatches] = await query(
                'SELECT id, name, recipient_count, sent_count, delivered_count, read_count, failed_count, status, channel, created_at, "api" as type FROM api_campaigns WHERE name LIKE ?',
                [`%${input}%`]
            );

            const allMatches = [...campMatches, ...apiMatches].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

            if (allMatches.length === 0) {
                console.error(`❌ Error: No campaign found matching ID or name "${input}".`);
                process.exit(1);
            } else if (allMatches.length === 1) {
                c = allMatches[0];
                campaignId = c.id;
                isApiCampaign = c.type === 'api';
                console.log(`🎯 Found unique match: "${c.name}" (ID: ${c.id})`);
            } else {
                console.log(`\n⚠️  Multiple campaigns matched your query:`);
                allMatches.forEach((m, idx) => {
                    console.log(`  [${idx + 1}] ID: ${m.id} | Name: ${m.name} | Created: ${new Date(m.created_at).toLocaleString()} (${m.type})`);
                });
                console.log(`\n👉 Picking the most recent one automatically: "${allMatches[0].name}" (ID: ${allMatches[0].id})`);
                c = allMatches[0];
                campaignId = c.id;
                isApiCampaign = c.type === 'api';
            }
        }

        console.log(`\n🔎 Investigating Campaign ID: ${campaignId} in database...`);
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
        const logsTable = isApiCampaign ? 'api_message_logs' : 'message_logs';
        const [logs] = await query(
            `SELECT recipient, status FROM ${logsTable} WHERE campaign_id = ?`,
            [campaignId]
        );

        // 3. Fetch all numbers in the campaign queue
        const queueTable = isApiCampaign ? 'api_campaign_queue' : 'campaign_queue';
        const [queue] = await query(
            `SELECT mobile, status FROM ${queueTable} WHERE campaign_id = ?`,
            [campaignId]
        );

        // Map status priorities per phone number to resolve fallback duplicate rows
        const numberStatusMap = {}; // mobile -> { category, status }
        
        logs.forEach(l => {
            const rawNum = String(l.recipient).replace(/\D/g, '');
            const stat = (l.status || '').toLowerCase();
            
            let category = 'failed';
            let prio = 1;

            if (stat === 'read' || stat === 'displayed' || stat === 'read_receipt') {
                category = 'read';
                prio = 4;
            } else if (stat === 'delivered') {
                category = 'delivered';
                prio = 3;
            } else if (stat === 'sent' || stat === 'submitted' || stat === 'success') {
                category = 'sent';
                prio = 2; // still pending handset status
            }

            const current = numberStatusMap[rawNum];
            if (!current || prio > current.prio) {
                numberStatusMap[rawNum] = { category, prio, status: stat };
            }
        });

        // 4. Analysis
        
        // A. Skipped Numbers: Uploaded in queue but never got recorded in message_logs
        const skippedNumbers = [];
        queue.forEach(q => {
            const rawNum = String(q.mobile).replace(/\D/g, '');
            if (!numberStatusMap[rawNum]) {
                skippedNumbers.push({
                    number: rawNum,
                    queueStatus: q.status
                });
            }
        });

        // B. Pending DLR Numbers: combined status is 'sent' (submitted but no delivery success/fail feedback)
        const uniquePending = [];
        // C. Group unique numbers by category
        const uniqueRead = new Set();
        const uniqueDelivered = new Set();
        const uniqueFailed = new Set();
        const uniqueSentOnly = new Set();

        Object.keys(numberStatusMap).forEach(mobile => {
            const entry = numberStatusMap[mobile];
            if (entry.category === 'read') {
                uniqueRead.add(mobile);
                uniqueDelivered.add(mobile); // Read implies delivered
            } else if (entry.category === 'delivered') {
                uniqueDelivered.add(mobile);
            } else if (entry.category === 'sent') {
                uniqueSentOnly.add(mobile);
                uniquePending.push(mobile);
            } else if (entry.category === 'failed') {
                uniqueFailed.add(mobile);
            }
        });

        const totalAttemptedUnique = Object.keys(numberStatusMap).length;

        console.log(`\n🔍 CAMPAIGN LOGS & QUEUE COMPARISON ANALYSIS:`);
        console.log(`------------------------------------------------------------------------`);
        console.log(`1. Total Numbers in Queue Table:   ${queue.length.toLocaleString()}`);
        console.log(`2. Unique Attempted in Logs:       ${totalAttemptedUnique.toLocaleString()}`);
        console.log(`3. Unique Delivered in Logs (DLR):  ${uniqueDelivered.size.toLocaleString()} (Includes Read)`);
        console.log(`4. Unique Read in Logs:             ${uniqueRead.size.toLocaleString()}`);
        console.log(`5. Unique Failed in Logs:           ${uniqueFailed.size.toLocaleString()}`);
        console.log(`------------------------------------------------------------------------`);
        console.log(`📈 DIFFERENCE BREAKDOWN:`);
        console.log(`------------------------------------------------------------------------`);
        console.log(`🔴 SKIPPED NUMBERS:         ${skippedNumbers.length.toLocaleString()} numbers`);
        console.log(`   (Uploaded in excel/list but never attempted or got filtered out due to duplicates/invalid format)`);
        console.log(`🟡 DLR PENDING (Sent Only):  ${uniquePending.length.toLocaleString()} numbers`);
        console.log(`   (Submitted to gateway but waiting for delivery receipt from carrier/handset offline)`);
        console.log(`🟢 ATTEMPTED & COMPLETED:   ${(uniqueDelivered.size + uniqueFailed.size).toLocaleString()} numbers`);
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
