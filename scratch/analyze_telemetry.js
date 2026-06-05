const campaigns = [
  {"id":"CAMP1780659098711","name":"Pothys - 05 Jun 2026 - DHNE3","status":"running","scheduled_at":"2026-06-05T12:10:00.000Z","next_run_at":"2026-06-05T12:10:00.000Z","recipient_count":47688,"sent_count":11985,"failed_count":519,"channel":"rcs"},
  {"id":"CAMP1780658835030","name":"Pothys - 05 Jun 2026 - ERNSB","status":"running","scheduled_at":"2026-06-05T11:50:00.000Z","next_run_at":"2026-06-05T11:50:00.000Z","recipient_count":0,"sent_count":11972,"failed_count":525,"channel":"rcs"},
  {"id":"CAMP1780658555622","name":"Pothys - 05 Jun 2026 - 3OGVY","status":"running","scheduled_at":"2026-06-05T11:35:00.000Z","next_run_at":"2026-06-05T11:35:00.000Z","recipient_count":40296,"sent_count":9493,"failed_count":42,"channel":"rcs"},
  {"id":"CAMP1780658093340","name":"Pothys - 05 Jun 2026 - ZJ8IC","status":"running","scheduled_at":"2026-06-05T11:20:00.000Z","next_run_at":"2026-06-05T11:20:00.000Z","recipient_count":27347,"sent_count":3497,"failed_count":163,"channel":"rcs"},
  {"id":"CAMP1780657421960","name":"Pothys - 05 Jun 2026 - 6U0NZ","status":"running","scheduled_at":"2026-06-05T11:00:00.000Z","next_run_at":"2026-06-05T11:00:00.000Z","recipient_count":31900,"sent_count":2498,"failed_count":31,"channel":"rcs"},
  {"id":"CAMP1780654884754","name":"Pothys - 05 Jun 2026 - F2GFU","status":"sent","scheduled_at":"2026-06-05T10:45:00.000Z","next_run_at":"2026-06-05T10:45:00.000Z","recipient_count":0,"sent_count":0,"failed_count":0,"channel":"rcs"},
  {"id":"CAMP1780653343241","name":"Pothys - 05 Jun 2026 - YC94C","status":"running","scheduled_at":"2026-06-05T10:30:00.000Z","next_run_at":"2026-06-05T10:30:00.000Z","recipient_count":0,"sent_count":12481,"failed_count":333,"channel":"rcs"},
  {"id":"CAMP1780653005055","name":"Jredeems - 05 Jun 2026 - TEST","status":"sent","scheduled_at":null,"next_run_at":"2026-06-05T09:50:05.000Z","recipient_count":0,"sent_count":0,"failed_count":0,"channel":"whatsapp"},
  {"id":"CAMP1780652266402","name":"Pothys - 05 Jun 2026 - ACKV0","status":"running","scheduled_at":"2026-06-05T10:15:00.000Z","next_run_at":"2026-06-05T10:15:00.000Z","recipient_count":60519,"sent_count":16491,"failed_count":425,"channel":"rcs"},
  {"id":"CAMP1780652038128","name":"Pothys - 05 Jun 2026 - F9OKM","status":"running","scheduled_at":"2026-06-05T10:00:00.000Z","next_run_at":"2026-06-05T10:00:00.000Z","recipient_count":85144,"sent_count":16406,"failed_count":374,"channel":"rcs"},
  {"id":"CAMP1780651647834","name":"Pothys - 05 Jun 2026 - CO9AW","status":"running","scheduled_at":"2026-06-05T09:45:00.000Z","next_run_at":"2026-06-05T09:45:00.000Z","recipient_count":92446,"sent_count":16496,"failed_count":244,"channel":"rcs"},
  {"id":"CAMP1780651161170","name":"Pothys - 05 Jun 2026 - LZ41K","status":"running","scheduled_at":"2026-06-05T09:30:00.000Z","next_run_at":"2026-06-05T09:30:00.000Z","recipient_count":57834,"sent_count":16478,"failed_count":786,"channel":"rcs"},
  {"id":"CAMP1780647401207","name":"Pothys - 05 Jun 2026 - 9CF2H","status":"running","scheduled_at":"2026-06-05T08:30:00.000Z","next_run_at":"2026-06-05T08:30:00.000Z","recipient_count":154206,"sent_count":152975,"failed_count":0,"channel":"rcs"},
  {"id":"CAMP1780645722873","name":"Pothys - 05 Jun 2026 - M98B5","status":"sent","scheduled_at":null,"next_run_at":"2026-06-05T07:48:42.000Z","recipient_count":309904,"sent_count":309904,"failed_count":43114,"channel":"rcs"},
  {"id":"CAMP1780645341193","name":"Pothys - 05 Jun 2026 - B8RMI","status":"sent","scheduled_at":null,"next_run_at":"2026-06-05T07:42:21.000Z","recipient_count":2,"sent_count":2,"failed_count":0,"channel":"rcs"}
];

const queueStats = [
  {"campaign_id":"CAMP1780645341193","status":"sent","count":2},
  {"campaign_id":"CAMP1780645722873","status":"failed","count":1497},
  {"campaign_id":"CAMP1780645722873","status":"sent","count":308407},
  {"campaign_id":"CAMP1780647401207","status":"failed","count":26},
  {"campaign_id":"CAMP1780647401207","status":"processing","count":751},
  {"campaign_id":"CAMP1780647401207","status":"sent","count":153429},
  {"campaign_id":"CAMP1780651161170","status":"failed","count":522},
  {"campaign_id":"CAMP1780651161170","status":"pending","count":37991},
  {"campaign_id":"CAMP1780651161170","status":"processing","count":2706},
  {"campaign_id":"CAMP1780651161170","status":"sent","count":16615},
  {"campaign_id":"CAMP1780651647834","status":"failed","count":5},
  {"campaign_id":"CAMP1780651647834","status":"pending","count":73110},
  {"campaign_id":"CAMP1780651647834","status":"processing","count":2727},
  {"campaign_id":"CAMP1780651647834","status":"sent","count":16604},
  {"campaign_id":"CAMP1780652038128","status":"failed","count":94},
  {"campaign_id":"CAMP1780652038128","status":"pending","count":65726},
  {"campaign_id":"CAMP1780652038128","status":"processing","count":2727},
  {"campaign_id":"CAMP1780652038128","status":"sent","count":16597},
  {"campaign_id":"CAMP1780652266402","status":"failed","count":11},
  {"campaign_id":"CAMP1780652266402","status":"pending","count":40950},
  {"campaign_id":"CAMP1780652266402","status":"processing","count":2727},
  {"campaign_id":"CAMP1780652266402","status":"sent","count":16831},
  {"campaign_id":"CAMP1780653343241","status":"failed","count":19},
  {"campaign_id":"CAMP1780653343241","status":"pending","count":101725},
  {"campaign_id":"CAMP1780653343241","status":"processing","count":10345},
  {"campaign_id":"CAMP1780653343241","status":"sent","count":12911},
  {"campaign_id":"CAMP1780657421960","status":"failed","count":2},
  {"campaign_id":"CAMP1780657421960","status":"pending","count":26407},
  {"campaign_id":"CAMP1780657421960","status":"processing","count":2727},
  {"campaign_id":"CAMP1780657421960","status":"sent","count":2764},
  {"campaign_id":"CAMP1780658093340","status":"failed","count":4},
  {"campaign_id":"CAMP1780658093340","status":"pending","count":20811},
  {"campaign_id":"CAMP1780658093340","status":"processing","count":2727},
  {"campaign_id":"CAMP1780658093340","status":"sent","count":3805},
  {"campaign_id":"CAMP1780658555622","status":"failed","count":7},
  {"campaign_id":"CAMP1780658555622","status":"pending","count":28018},
  {"campaign_id":"CAMP1780658555622","status":"processing","count":2727},
  {"campaign_id":"CAMP1780658555622","status":"sent","count":9544},
  {"campaign_id":"CAMP1780658835030","status":"failed","count":28},
  {"campaign_id":"CAMP1780658835030","status":"pending","count":3819},
  {"campaign_id":"CAMP1780658835030","status":"processing","count":2727},
  {"campaign_id":"CAMP1780658835030","status":"sent","count":12426},
  {"campaign_id":"CAMP1780659098711","status":"failed","count":18},
  {"campaign_id":"CAMP1780659098711","status":"pending","count":32507},
  {"campaign_id":"CAMP1780659098711","status":"processing","count":2727},
  {"campaign_id":"CAMP1780659098711","status":"sent","count":12436}
];

function main() {
    // Group queue stats by campaign_id
    const queueMap = {};
    queueStats.forEach(stat => {
        const cid = stat.campaign_id;
        const status = stat.status;
        const count = parseInt(stat.count || 0);

        if (!queueMap[cid]) {
            queueMap[cid] = { pending: 0, processing: 0, sent: 0, failed: 0 };
        }
        queueMap[cid][status] = count;
    });

    console.log(`\n===================================================================================================================================`);
    console.log(`📊 LIVE CAMPAIGNS SUMMARY REPORT (05 JUN 2026)`);
    console.log(`===================================================================================================================================`);
    console.log(
        String("Campaign Name").padEnd(32) + " | " +
        String("Channel").padEnd(10) + " | " +
        String("Campaigns Table (Sent/Fail/Total)").padEnd(35) + " | " +
        String("Queue Table (Pending/Proc/Sent/Fail)").padEnd(45)
    );
    console.log("-".repeat(135));

    campaigns.forEach(c => {
        const q = queueMap[c.id] || { pending: 0, processing: 0, sent: 0, failed: 0 };
        const qTotal = q.pending + q.processing + q.sent + q.failed;
        
        const campStr = `${c.sent_count}/${c.failed_count}/${c.recipient_count}`;
        const queueStr = `${q.pending}/${q.processing}/${q.sent}/${q.failed} (Total: ${qTotal})`;

        console.log(
            String(c.name).padEnd(32) + " | " +
            String(c.channel).padEnd(10) + " | " +
            String(campStr).padEnd(35) + " | " +
            String(queueStr).padEnd(45)
        );
    });

    // Let's calculate totals
    let totalCampsRecipients = 0;
    let totalCampsSent = 0;
    let totalCampsFailed = 0;
    let totalQueuePending = 0;
    let totalQueueProcessing = 0;
    let totalQueueSent = 0;
    let totalQueueFailed = 0;

    campaigns.forEach(c => {
        totalCampsRecipients += parseInt(c.recipient_count || 0);
        totalCampsSent += parseInt(c.sent_count || 0);
        totalCampsFailed += parseInt(c.failed_count || 0);

        const q = queueMap[c.id] || { pending: 0, processing: 0, sent: 0, failed: 0 };
        totalQueuePending += q.pending;
        totalQueueProcessing += q.processing;
        totalQueueSent += q.sent;
        totalQueueFailed += q.failed;
    });

    console.log("-".repeat(135));
    console.log(
        String("TOTALS").padEnd(32) + " | " +
        String("").padEnd(10) + " | " +
        String(`${totalCampsSent}/${totalCampsFailed}/${totalCampsRecipients}`).padEnd(35) + " | " +
        String(`${totalQueuePending}/${totalQueueProcessing}/${totalQueueSent}/${totalQueueFailed} (Total: ${totalQueuePending + totalQueueProcessing + totalQueueSent + totalQueueFailed})`).padEnd(45)
    );
    console.log(`===================================================================================================================================`);

    // Diagnose mismatches
    console.log("\n🔍 DETAILED ANALYSIS & ANOMALIES IDENTIFIED:");
    campaigns.forEach(c => {
        const q = queueMap[c.id];
        if (!q) {
            console.log(`\n• Campaign: ${c.name} (${c.id}) is complete or has no records in campaign_queue.`);
            return;
        }
        
        const diffSent = q.sent - c.sent_count;
        const diffFailed = q.failed - c.failed_count;
        const qTotal = q.pending + q.processing + q.sent + q.failed;

        console.log(`\n• Campaign: ${c.name} (${c.id}) [Status: ${c.status}]`);
        console.log(`  Queue Total: ${qTotal} (Pending: ${q.pending}, Processing: ${q.processing}, Sent: ${q.sent}, Failed: ${q.failed})`);
        console.log(`  Campaigns Table: Recipient: ${c.recipient_count}, Sent: ${c.sent_count}, Failed: ${c.failed_count}`);
        
        if (diffSent !== 0) {
            console.log(`  ⚠️ Sent mismatch: Queue shows ${q.sent} sent, campaigns table shows ${c.sent_count} (DB is behind by ${diffSent}).`);
        }
        if (diffFailed !== 0) {
            console.log(`  ⚠️ Failed mismatch: Queue shows ${q.failed} failed, campaigns table shows ${c.failed_count} (Diff: ${diffFailed}).`);
        }
        if (c.recipient_count !== qTotal && c.recipient_count !== 0) {
            console.log(`  ⚠️ Recipient mismatch: Campaigns table recipient_count is ${c.recipient_count}, queue has ${qTotal} (Diff: ${qTotal - c.recipient_count}).`);
        }
        if (q.pending > 0 || q.processing > 0) {
            console.log(`  ⏳ In Progress: Has ${q.pending} pending and ${q.processing} processing items remaining.`);
        } else {
            console.log(`  ✅ Finished Sending: 0 items pending/processing in queue.`);
            if (c.status === 'running') {
                console.log(`  🛑 Stuck Status: Status is still 'running' even though queue is empty. Needs sync status to 'sent'.`);
            }
        }
    });
}

main();
