#!/usr/bin/env node
/**
 * POTHYS CAMPAIGN LIVE STATUS CHECKER
 * Server pe run karo: node /root/notifynownew17feb/backend/scratch/check_pothys.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.production') });
const mysql = require('mysql2/promise');

async function main() {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME
    });

    // Get all Pothys campaigns
    const [rows] = await conn.execute(
        "SELECT id, name, channel, status, audience_count, recipient_count, sent_count, delivered_count, read_count, failed_count, created_at, updated_at FROM campaigns WHERE name LIKE 'Pothys - 22 May 2026%' ORDER BY created_at ASC"
    );

    if (rows.length === 0) {
        console.log('❌ Koi Pothys campaign nahi mili!');
        await conn.end();
        return;
    }

    // Check queue backlog for each campaign
    const ids = rows.map(r => r.id);
    const placeholders = ids.map(() => '?').join(',');
    const [queue] = await conn.execute(
        `SELECT campaign_id, COUNT(*) as pending FROM campaign_queue WHERE status IN ('pending','processing') AND campaign_id IN (${placeholders}) GROUP BY campaign_id`,
        ids
    );
    const queueMap = {};
    queue.forEach(q => { queueMap[q.campaign_id] = Number(q.pending); });

    // Also check message_logs for RCS fallback SMS counts
    const [fallback] = await conn.execute(
        `SELECT campaign_id, 
                SUM(CASE WHEN channel = 'sms' THEN 1 ELSE 0 END) as sms_fallback,
                SUM(CASE WHEN channel = 'rcs' AND status = 'delivered' THEN 1 ELSE 0 END) as rcs_delivered,
                SUM(CASE WHEN channel = 'rcs' AND status = 'failed' THEN 1 ELSE 0 END) as rcs_failed,
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
    console.log('║         Checked at: ' + new Date().toLocaleString('en-IN').padEnd(39) + '║');
    console.log('╚══════════════════════════════════════════════════════════════╝');

    rows.forEach(r => {
        const total  = Math.max(r.audience_count||0, r.recipient_count||0);
        const sent   = r.sent_count || 0;
        const deliv  = r.delivered_count || 0;
        const read   = r.read_count || 0;
        const fail   = r.failed_count || 0;
        const qPend  = queueMap[r.id] || 0;
        const fb     = fallbackMap[r.id] || {};
        const smsFB  = fb.sms_fallback || 0;
        const delivRate = total > 0 ? ((deliv/total)*100).toFixed(1) : '0';

        const statusIcon = r.status === 'completed' ? '✅' : 
                           r.status === 'running' ? '🔄' : 
                           r.status === 'failed' ? '❌' : '⏸️';

        console.log('\n┌────────────────────────────────────────────────────────────');
        console.log('│ ' + statusIcon + ' ' + r.name);
        console.log('│ Status    : ' + r.status.toUpperCase() + '  |  Updated: ' + new Date(r.updated_at).toLocaleString('en-IN'));
        console.log('│ ─────────────────────────────────────────────');
        console.log('│ Total     : ' + total.toLocaleString());
        console.log('│ Sent      : ' + sent.toLocaleString());
        console.log('│ Delivered : ' + deliv.toLocaleString() + ' (' + delivRate + '%)');
        console.log('│ Read      : ' + read.toLocaleString());
        console.log('│ Failed    : ' + fail.toLocaleString());
        console.log('│ ─────────────────────────────────────────────');
        if (smsFB > 0) {
            console.log('│ SMS Fallback sent   : ' + smsFB.toLocaleString());
            console.log('│ SMS Fallback deliv  : ' + (fb.sms_delivered||0).toLocaleString());
            console.log('│ SMS Fallback failed : ' + (fb.sms_failed||0).toLocaleString());
        } else {
            console.log('│ SMS Fallback  : 0 (no fallback triggered)');
        }
        if (qPend > 0) {
            console.log('│ ⏳ STILL IN QUEUE: ' + qPend.toLocaleString() + ' messages pending!');
        } else {
            console.log('│ ✅ Queue empty — sending done');
        }
        console.log('└────────────────────────────────────────────────────────────');
    });

    // Grand totals
    const totTotal = rows.reduce((s,r) => s + Math.max(r.audience_count||0, r.recipient_count||0), 0);
    const totSent  = rows.reduce((s,r) => s + (r.sent_count||0), 0);
    const totDeliv = rows.reduce((s,r) => s + (r.delivered_count||0), 0);
    const totRead  = rows.reduce((s,r) => s + (r.read_count||0), 0);
    const totFail  = rows.reduce((s,r) => s + (r.failed_count||0), 0);
    const totQueue = Object.values(queueMap).reduce((s,v) => s+v, 0);
    const totSMSFB = Object.values(fallbackMap).reduce((s,f) => s+(f.sms_fallback||0), 0);
    const totSMSDeliv = Object.values(fallbackMap).reduce((s,f) => s+(f.sms_delivered||0), 0);
    const totDelivRate = totTotal > 0 ? ((totDeliv/totTotal)*100).toFixed(1) : '0';

    console.log('\n╔══════════════════════════════════════════════════════╗');
    console.log('║          GRAND TOTAL — 6 Campaigns Combined         ║');
    console.log('╠══════════════════════════════════════════════════════╣');
    console.log('║  Total         : ' + totTotal.toLocaleString().padEnd(35) + '║');
    console.log('║  Sent          : ' + totSent.toLocaleString().padEnd(35) + '║');
    console.log('║  Delivered(RCS): ' + (totDeliv.toLocaleString() + ' (' + totDelivRate + '%)').padEnd(35) + '║');
    console.log('║  Read          : ' + totRead.toLocaleString().padEnd(35) + '║');
    console.log('║  Failed        : ' + totFail.toLocaleString().padEnd(35) + '║');
    console.log('║  SMS Fallback  : ' + totSMSFB.toLocaleString().padEnd(35) + '║');
    console.log('║  SMS Delivered : ' + totSMSDeliv.toLocaleString().padEnd(35) + '║');
    console.log('║  Queue Pending : ' + totQueue.toLocaleString().padEnd(35) + '║');
    console.log('╚══════════════════════════════════════════════════════╝');

    if (totQueue === 0) {
        const allDone = rows.every(r => r.status === 'completed');
        if (allDone) {
            console.log('\n🎉 SARE CAMPAIGNS COMPLETE! Queue empty. Koi bhi pending nahi.');
        } else {
            const notDone = rows.filter(r => r.status !== 'completed').map(r => r.name.split(' - ').pop());
            console.log('\n⚠️  Queue empty but ye campaigns completed nahi hain: ' + notDone.join(', '));
            console.log('   PM2 restart karo ya check karo: pm2 logs notifynow-live-prod');
        }
    } else {
        console.log('\n⏳ ABHI BHI CHAL RAHA HAI — ' + totQueue.toLocaleString() + ' messages queue mein hain.');
        console.log('   Thodi der baad dobara run karo ye script.');
    }

    await conn.end();
}
main().catch(e => {
    console.error('❌ Error:', e.message);
    process.exit(1);
});
