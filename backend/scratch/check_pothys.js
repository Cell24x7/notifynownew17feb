#!/usr/bin/env node
/**
 * POTHYS CAMPAIGN LIVE STATUS CHECKER
 * Server pe run karo: node /root/notifynownew17feb/backend/scratch/check_pothys.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.production') });
const mysql = require('mysql2/promise');

// Helper: format number with commas
const n = (num) => Number(num || 0).toLocaleString('en-IN');
const col = (str, width) => String(str).padEnd(width);

async function main() {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME
    });

    // Only real campaigns (skip test ones with Total=1)
    const [rows] = await conn.execute(
        "SELECT id, name, channel, status, audience_count, recipient_count, sent_count, delivered_count, read_count, failed_count, created_at, updated_at FROM campaigns WHERE name LIKE 'Pothys - 22 May 2026%' AND GREATEST(COALESCE(audience_count,0), COALESCE(recipient_count,0)) > 100 ORDER BY created_at ASC"
    );

    if (rows.length === 0) {
        console.log('❌ Koi Pothys campaign nahi mili!');
        await conn.end();
        return;
    }

    const ids = rows.map(r => r.id);
    const placeholders = ids.map(() => '?').join(',');

    // Queue backlog
    const [queue] = await conn.execute(
        `SELECT campaign_id, COUNT(*) as pending FROM campaign_queue WHERE status IN ('pending','processing') AND campaign_id IN (${placeholders}) GROUP BY campaign_id`,
        ids
    );
    const queueMap = {};
    queue.forEach(q => { queueMap[q.campaign_id] = Number(q.pending); });

    // SMS fallback from message_logs
    const [fallback] = await conn.execute(
        `SELECT campaign_id,
                SUM(CASE WHEN channel = 'sms' THEN 1 ELSE 0 END) as sms_fallback,
                SUM(CASE WHEN channel = 'sms' AND status = 'delivered' THEN 1 ELSE 0 END) as sms_delivered,
                SUM(CASE WHEN channel = 'sms' AND status = 'failed' THEN 1 ELSE 0 END) as sms_failed
         FROM message_logs
         WHERE campaign_id IN (${placeholders})
         GROUP BY campaign_id`,
        ids
    );
    const fallbackMap = {};
    fallback.forEach(f => { fallbackMap[f.campaign_id] = f; });

    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║         POTHYS 22 MAY 2026 — LIVE STATUS CHECK              ║');
    console.log('║  Checked at: ' + col(new Date().toLocaleString('en-IN'), 47) + '║');
    console.log('╚══════════════════════════════════════════════════════════════╝');

    rows.forEach(r => {
        const total    = Math.max(Number(r.audience_count||0), Number(r.recipient_count||0));
        const sent     = Number(r.sent_count || 0);
        const deliv    = Number(r.delivered_count || 0);
        const read     = Number(r.read_count || 0);
        const fail     = Number(r.failed_count || 0);
        const qPend    = queueMap[r.id] || 0;
        const fb       = fallbackMap[r.id] || {};
        const smsFB    = Number(fb.sms_fallback || 0);
        const smsDeliv = Number(fb.sms_delivered || 0);
        const smsFail  = Number(fb.sms_failed || 0);
        const delivRate  = total > 0 ? ((deliv/total)*100).toFixed(1) : '0';
        const effReach   = total > 0 ? (((deliv + smsDeliv)/total)*100).toFixed(1) : '0';

        const statusIcon = r.status === 'completed' ? '✅' :
                           r.status === 'running'   ? '🔄' :
                           r.status === 'failed'    ? '❌' : '⏸️ ';

        console.log('\n┌────────────────────────────────────────────────────────────');
        console.log('│ ' + statusIcon + ' ' + r.name);
        console.log('│ Status: ' + r.status.toUpperCase() + '  |  Updated: ' + new Date(r.updated_at).toLocaleString('en-IN'));
        console.log('│ ─── RCS ─────────────────────────────');
        console.log('│ Total         : ' + n(total));
        console.log('│ Sent          : ' + n(sent));
        console.log('│ RCS Delivered : ' + n(deliv) + ' (' + delivRate + '%)');
        console.log('│ RCS Read      : ' + n(read));
        console.log('│ RCS Failed    : ' + n(fail));
        if (smsFB > 0) {
            console.log('│ ─── SMS Fallback ────────────────────');
            console.log('│ SMS Sent      : ' + n(smsFB));
            console.log('│ SMS Delivered : ' + n(smsDeliv));
            console.log('│ SMS Failed    : ' + n(smsFail));
            console.log('│ ─── Combined ────────────────────────');
            console.log('│ Effective Reach: ' + n(deliv + smsDeliv) + ' (' + effReach + '%)');
        }
        console.log('│ ─────────────────────────────────────');
        if (qPend > 0) {
            console.log('│ ⏳ QUEUE: ' + n(qPend) + ' messages still pending');
        } else {
            console.log('│ ✅ Queue empty — sending complete');
        }
        console.log('└────────────────────────────────────────────────────────────');
    });

    // ─── Grand Total ─────────────────────────────────────────────
    const totTotal    = rows.reduce((s,r) => s + Math.max(Number(r.audience_count||0), Number(r.recipient_count||0)), 0);
    const totSent     = rows.reduce((s,r) => s + Number(r.sent_count||0), 0);
    const totDeliv    = rows.reduce((s,r) => s + Number(r.delivered_count||0), 0);
    const totRead     = rows.reduce((s,r) => s + Number(r.read_count||0), 0);
    const totFail     = rows.reduce((s,r) => s + Number(r.failed_count||0), 0);
    const totQueue    = Object.values(queueMap).reduce((s,v) => s + Number(v), 0);
    const totSMSFB    = Object.values(fallbackMap).reduce((s,f) => s + Number(f.sms_fallback||0), 0);
    const totSMSDlv   = Object.values(fallbackMap).reduce((s,f) => s + Number(f.sms_delivered||0), 0);
    const totSMSFail  = Object.values(fallbackMap).reduce((s,f) => s + Number(f.sms_failed||0), 0);
    const totEffReach = totDeliv + totSMSDlv;
    const totDelivPct = totTotal > 0 ? ((totDeliv/totTotal)*100).toFixed(1) : '0';
    const totEffPct   = totTotal > 0 ? ((totEffReach/totTotal)*100).toFixed(1) : '0';

    const W = 35;
    console.log('\n╔══════════════════════════════════════════════════════╗');
    console.log('║        GRAND TOTAL — ' + rows.length + ' Campaigns Combined          ║');
    console.log('╠══════════════════════════════════════════════════════╣');
    console.log('║  Total Numbers    : ' + col(n(totTotal), W) + '║');
    console.log('║  Total Sent       : ' + col(n(totSent), W) + '║');
    console.log('╠══════════════════════════════════════════════════════╣');
    console.log('║  RCS Delivered    : ' + col(n(totDeliv) + ' (' + totDelivPct + '%)', W) + '║');
    console.log('║  RCS Read         : ' + col(n(totRead), W) + '║');
    console.log('║  RCS Failed       : ' + col(n(totFail), W) + '║');
    console.log('╠══════════════════════════════════════════════════════╣');
    console.log('║  SMS Fallback Sent: ' + col(n(totSMSFB), W) + '║');
    console.log('║  SMS Fallback Dlvd: ' + col(n(totSMSDlv), W) + '║');
    console.log('║  SMS Fallback Fail: ' + col(n(totSMSFail), W) + '║');
    console.log('╠══════════════════════════════════════════════════════╣');
    console.log('║  ✨ EFFECTIVE REACH: ' + col(n(totEffReach) + ' (' + totEffPct + '%)', W) + '║');
    console.log('║  ⏳ Queue Pending  : ' + col(n(totQueue), W) + '║');
    console.log('╚══════════════════════════════════════════════════════╝');

    if (totQueue === 0) {
        const allDone = rows.every(r => r.status === 'completed' || r.status === 'sent');
        if (allDone) {
            console.log('\n🎉 SARE CAMPAIGNS COMPLETE! Queue empty. Koi bhi pending nahi.');
        } else {
            const notDone = rows.filter(r => r.status === 'running').map(r => r.name.split(' - ').pop());
            console.log('\n⚠️  Queue empty but still running: ' + notDone.join(', '));
        }
    } else {
        console.log('\n⏳ ALMOST DONE — sirf ' + n(totQueue) + ' messages queue mein hain.');
        console.log('   5-10 min mein automatically complete ho jayega.');
    }

    await conn.end();

}
main().catch(e => {
    console.error('❌ Error:', e.message);
    process.exit(1);
});
