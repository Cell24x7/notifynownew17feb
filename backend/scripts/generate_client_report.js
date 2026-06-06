/**
 * 📊 GENERATE CLIENT SUMMARY REPORT (RCS vs SMS FAILOVER)
 * 
 * Run: NODE_ENV=production node backend/scripts/generate_client_report.js
 */

const path = require('path');
const dotenv = require('dotenv');
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
dotenv.config({ path: path.join(__dirname, '..', envFile) });

const { query } = require('../config/db');

async function run() {
    console.log('\n📊 ===== GENERATING CLIENT CAMPAIGN REPORT =====\n');

    try {
        // Fetch all campaigns from June 5 and June 6, 2026
        const [campaigns] = await query(`
            SELECT c.id, c.name, c.channel, c.status, c.recipient_count, c.created_at, u.company
            FROM campaigns c
            LEFT JOIN users u ON c.user_id = u.id
            WHERE c.created_at >= '2026-06-05 00:00:00'
            ORDER BY c.created_at DESC
        `);

        if (campaigns.length === 0) {
            console.log('❌ No campaigns found for the specified period.');
            process.exit(0);
        }

        console.log(`Found ${campaigns.length} campaigns. Analyzing channel breakdowns from message_logs...\n`);

        let grandTotal = 0;
        let grandRcsSent = 0, grandRcsDelivered = 0, grandRcsRead = 0, grandRcsFailed = 0, grandRcsPending = 0;
        let grandSmsSent = 0, grandSmsDelivered = 0, grandSmsFailed = 0, grandSmsPending = 0;

        const reportData = [];

        for (const camp of campaigns) {
            const total = Number(camp.recipient_count || 0);
            
            // Query message logs for this campaign grouped by channel and status
            const [logs] = await query(`
                SELECT channel, status, COUNT(*) as count
                FROM message_logs
                WHERE campaign_id = ?
                GROUP BY channel, status
            `, [camp.id]);

            // Initialize counters
            let rcsSent = 0, rcsDelivered = 0, rcsRead = 0, rcsFailed = 0, rcsPending = 0;
            let smsSent = 0, smsDelivered = 0, smsFailed = 0, smsPending = 0;

            for (const row of logs) {
                const chan = (row.channel || 'rcs').toLowerCase();
                const status = (row.status || '').toLowerCase();
                const count = Number(row.count || 0);

                if (chan === 'sms') {
                    smsSent += count;
                    if (status === 'delivered') {
                        smsDelivered += count;
                    } else if (status === 'failed') {
                        smsFailed += count;
                    } else {
                        smsPending += count;
                    }
                } else {
                    // RCS
                    rcsSent += count;
                    if (status === 'read' || status === 'displayed' || status === 'read_receipt') {
                        rcsRead += count;
                        rcsDelivered += count;
                    } else if (status === 'delivered') {
                        rcsDelivered += count;
                    } else if (status === 'failed') {
                        rcsFailed += count;
                    } else {
                        rcsPending += count;
                    }
                }
            }

            // If campaign is completed, adjust Option B remaining/skipped as failed under the primary channel (RCS)
            const isCompleted = ['sent', 'completed', 'failed'].includes(camp.status?.toLowerCase());
            const totalAttempted = rcsSent + smsSent;
            if (isCompleted && total > totalAttempted) {
                const skipped = total - totalAttempted;
                rcsFailed += skipped;
                rcsSent += skipped;
            }

            grandTotal += total;
            grandRcsSent += rcsSent;
            grandRcsDelivered += rcsDelivered;
            grandRcsRead += rcsRead;
            grandRcsFailed += rcsFailed;
            grandRcsPending += rcsPending;

            grandSmsSent += smsSent;
            grandSmsDelivered += smsDelivered;
            grandSmsFailed += smsFailed;
            grandSmsPending += smsPending;

            reportData.push({
                name: camp.name,
                company: camp.company || 'Unknown',
                total,
                rcs: { sent: rcsSent, delivered: rcsDelivered, read: rcsRead, failed: rcsFailed, pending: rcsPending },
                sms: { sent: smsSent, delivered: smsDelivered, failed: smsFailed, pending: smsPending }
            });
        }

        // Print client summary in Markdown table format
        console.log('### 📱 DETAILED CAMPAIGN SUMMARY REPORT (RCS vs SMS)');
        console.log('');
        console.log('| Campaign Name | Client | Total Target | RCS Attempted | RCS Delivered | RCS Read | RCS Failed | RCS Pending | SMS Failover | SMS Delivered | SMS Failed | SMS Pending |');
        console.log('| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |');

        for (const r of reportData) {
            console.log(`| ${r.name} | ${r.company} | ${r.total.toLocaleString()} | ${r.rcs.sent.toLocaleString()} | ${r.rcs.delivered.toLocaleString()} | ${r.rcs.read.toLocaleString()} | ${r.rcs.failed.toLocaleString()} | ${r.rcs.pending.toLocaleString()} | ${r.sms.sent.toLocaleString()} | ${r.sms.delivered.toLocaleString()} | ${r.sms.failed.toLocaleString()} | ${r.sms.pending.toLocaleString()} |`);
        }

        console.log('\n========================================================================');
        console.log('📈 GRAND TOTAL PERFORMANCE SUMMARY');
        console.log('========================================================================');
        console.log(`• Grand Total Target (Uploaded) : ${grandTotal.toLocaleString()}`);
        console.log('------------------------------------------------------------------------');
        console.log(`• RCS Channels Breakdown:`);
        console.log(`  - RCS Sent (Attempts)         : ${grandRcsSent.toLocaleString()}`);
        console.log(`  - RCS Delivered               : ${grandRcsDelivered.toLocaleString()} (${((grandRcsDelivered/Math.max(1, grandRcsSent))*100).toFixed(1)}%)`);
        console.log(`  - RCS Read (Seen)             : ${grandRcsRead.toLocaleString()} (${((grandRcsRead/Math.max(1, grandRcsSent))*100).toFixed(1)}%)`);
        console.log(`  - RCS Failed                  : ${grandRcsFailed.toLocaleString()}`);
        console.log(`  - RCS Pending DLR             : ${grandRcsPending.toLocaleString()}`);
        console.log('------------------------------------------------------------------------');
        console.log(`• SMS Failover Breakdown:`);
        console.log(`  - SMS Sent (Failovers)        : ${grandSmsSent.toLocaleString()}`);
        console.log(`  - SMS Delivered               : ${grandSmsDelivered.toLocaleString()} (${((grandSmsDelivered/Math.max(1, grandSmsSent))*100).toFixed(1)}%)`);
        console.log(`  - SMS Failed                  : ${grandSmsFailed.toLocaleString()}`);
        console.log(`  - SMS Pending DLR             : ${grandSmsPending.toLocaleString()}`);
        console.log('========================================================================\n');

        process.exit(0);
    } catch (e) {
        console.error('Error generating report:', e.message);
        process.exit(1);
    }
}

run();
