const path = require('path');
const dotenv = require('dotenv');

// Load environment config
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
dotenv.config({ path: path.join(__dirname, '..', envFile) });

const { query } = require('../config/db');

async function run() {
    try {
        console.log('Fetching campaigns for 22 May 2026...');
        const [campaigns] = await query(`
            SELECT id, name, recipient_count, sent_count, delivered_count, read_count, failed_count
            FROM campaigns
            WHERE name LIKE '%22 May 2026%'
            ORDER BY created_at DESC
        `);

        if (campaigns.length === 0) {
            console.log('No campaigns found containing "22 May 2026" in name.');
            process.exit(0);
        }

        console.log(`Found ${campaigns.length} campaigns. Fetching breakdown...\n`);

        let grandTotalBase = 0;
        let grandRcsSent = 0;
        let grandRcsDelivered = 0;
        let grandRcsRead = 0;
        let grandRcsFailed = 0;
        let grandSmsSent = 0;
        let grandSmsDelivered = 0;
        let grandSmsFailed = 0;

        const campaignReports = [];

        for (const camp of campaigns) {
            const [channelStats] = await query(`
                SELECT channel, status, COUNT(*) as count 
                FROM message_logs 
                WHERE campaign_id = ? 
                GROUP BY channel, status
            `, [camp.id]);

            const breakdown = {
                rcs: { sent: 0, delivered: 0, read: 0, failed: 0 },
                sms: { sent: 0, delivered: 0, read: 0, failed: 0 }
            };

            for (const stat of channelStats) {
                const chan = (stat.channel || '').toLowerCase();
                const status = (stat.status || '').toLowerCase();
                const count = parseInt(stat.count || 0, 10);

                if (!breakdown[chan]) {
                    breakdown[chan] = { sent: 0, delivered: 0, read: 0, failed: 0 };
                }

                if (status === 'read' || status === 'displayed' || status === 'read_receipt') {
                    breakdown[chan].read += count;
                    breakdown[chan].delivered += count;
                    breakdown[chan].sent += count;
                } else if (status === 'delivered') {
                    breakdown[chan].delivered += count;
                    breakdown[chan].sent += count;
                } else if (status === 'failed') {
                    breakdown[chan].failed += count;
                    breakdown[chan].sent += count;
                } else if (status === 'sent' || status === 'submitted' || status === 'success') {
                    breakdown[chan].sent += count;
                }
            }

            const totalBase = camp.recipient_count || 0;
            const rcs = breakdown.rcs;
            const sms = breakdown.sms;

            grandTotalBase += totalBase;
            grandRcsSent += rcs.sent;
            grandRcsDelivered += rcs.delivered;
            grandRcsRead += rcs.read;
            grandRcsFailed += rcs.failed;
            grandSmsSent += sms.sent;
            grandSmsDelivered += sms.delivered;
            grandSmsFailed += sms.failed;

            campaignReports.push({
                name: camp.name,
                totalBase,
                rcs,
                sms
            });
        }

        // Output Report
        let output = `========================================================================\n`;
        output += `📊 CAMPAIGN SUMMARY REPORT - 22 MAY 2026\n`;
        output += `========================================================================\n\n`;

        for (const r of campaignReports) {
            output += `📋 Campaign Name: ${r.name}\n`;
            output += `--------------------------------------------------\n`;
            output += `• Total Target Base: ${r.totalBase.toLocaleString()}\n\n`;
            
            output += `💬 Channel 1: RCS (Primary)\n`;
            output += `  - Sent:       ${r.rcs.sent.toLocaleString()}\n`;
            output += `  - Delivered:  ${r.rcs.delivered.toLocaleString()} (${r.rcs.sent > 0 ? ((r.rcs.delivered / r.rcs.sent) * 100).toFixed(1) : 0}% of Sent)\n`;
            output += `  - Read:       ${r.rcs.read.toLocaleString()} (${r.rcs.delivered > 0 ? ((r.rcs.read / r.rcs.delivered) * 100).toFixed(1) : 0}% of Delivered)\n`;
            output += `  - Failed:     ${r.rcs.failed.toLocaleString()} (Triggered SMS Fallback)\n\n`;

            output += `✉️ Channel 2: SMS Fallback\n`;
            output += `  - Sent (Fallback): ${r.sms.sent.toLocaleString()}\n`;
            output += `  - Delivered:       ${r.sms.delivered.toLocaleString()} (${r.sms.sent > 0 ? ((r.sms.delivered / r.sms.sent) * 100).toFixed(1) : 0}% of Fallback)\n`;
            output += `  - Failed:          ${r.sms.failed.toLocaleString()}\n\n`;

            output += `📈 Overall Campaign Delivery Success:\n`;
            const totalDelivered = r.rcs.delivered + r.sms.delivered;
            output += `  - Total Delivered: ${totalDelivered.toLocaleString()} (${r.totalBase > 0 ? ((totalDelivered / r.totalBase) * 100).toFixed(1) : 0}% of Total Base)\n`;
            output += `\n`;
        }

        output += `========================================================================\n`;
        output += `👑 CONSOLIDATED GRAND TOTALS\n`;
        output += `========================================================================\n`;
        output += `• Total Combined Target Base: ${grandTotalBase.toLocaleString()}\n\n`;
        
        output += `💬 RCS Grand Totals:\n`;
        output += `  - Sent:       ${grandRcsSent.toLocaleString()}\n`;
        output += `  - Delivered:  ${grandRcsDelivered.toLocaleString()} (${grandRcsSent > 0 ? ((grandRcsDelivered / grandRcsSent) * 100).toFixed(1) : 0}% of Sent)\n`;
        output += `  - Read:       ${grandRcsRead.toLocaleString()} (${grandRcsDelivered > 0 ? ((grandRcsRead / grandRcsDelivered) * 100).toFixed(1) : 0}% of Delivered)\n`;
        output += `  - Failed:     ${grandRcsFailed.toLocaleString()}\n\n`;

        output += `✉️ SMS Fallback Grand Totals:\n`;
        output += `  - Sent:       ${grandSmsSent.toLocaleString()}\n`;
        output += `  - Delivered:  ${grandSmsDelivered.toLocaleString()} (${grandSmsSent > 0 ? ((grandSmsDelivered / grandSmsSent) * 100).toFixed(1) : 0}% of Fallback)\n`;
        output += `  - Failed:     ${grandSmsFailed.toLocaleString()}\n\n`;

        output += `🏆 Overall Performance Summary:\n`;
        const grandDelivered = grandRcsDelivered + grandSmsDelivered;
        output += `  - Total Base:      ${grandTotalBase.toLocaleString()}\n`;
        output += `  - Total Delivered: ${grandDelivered.toLocaleString()} (${grandTotalBase > 0 ? ((grandDelivered / grandTotalBase) * 100).toFixed(1) : 0}% of Total Base)\n`;
        output += `========================================================================\n`;

        console.log(output);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();
