const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
const fs = require('fs');
let envFile = '.env';
const prodEnv = path.join(__dirname, '../.env.production');
if (fs.existsSync(prodEnv)) {
    envFile = '.env.production';
}
dotenv.config({ path: path.join(__dirname, '../', envFile) });

const { query } = require('../config/db');

async function diagnose() {
    console.log('======================================================');
    console.log('🔍 NOTIFYNOW CAMPAIGN DIAGNOSTICS');
    console.log('======================================================');
    console.log(`Node Environment: ${process.env.NODE_ENV}`);
    console.log(`Database Name: ${process.env.DB_NAME}`);
    console.log(`BYPASS_DND env: ${process.env.BYPASS_DND}`);
    console.log(`Current Server Time (Node): ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })} IST`);

    try {
        // 1. Get latest 3 campaigns
        const [camps] = await query('SELECT id, name, channel, status, recipient_count, created_at, user_id FROM campaigns ORDER BY created_at DESC LIMIT 5');
        console.log('\n📋 LATEST CAMPAIGNS:');
        if (camps.length === 0) {
            console.log('   No campaigns found.');
        } else {
            for (const c of camps) {
                console.log(`   - ID: ${c.id}`);
                console.log(`     Name: ${c.name}`);
                console.log(`     Channel: ${c.channel}`);
                console.log(`     Status: ${c.status}`);
                console.log(`     Recipients: ${c.recipient_count}`);
                console.log(`     Created At: ${c.created_at}`);
                console.log(`     User ID: ${c.user_id}`);
                
                // Count items in queue for this campaign
                const [queueCount] = await query('SELECT status, COUNT(*) as count FROM campaign_queue WHERE campaign_id = ? GROUP BY status', [c.id]);
                console.log('     Queue Statuses:');
                if (queueCount.length === 0) {
                    console.log('       No items found in campaign_queue for this campaign.');
                } else {
                    queueCount.forEach(q => {
                        console.log(`       * ${q.status}: ${q.count}`);
                    });
                }

                // Check logs
                const [logsCount] = await query('SELECT status, COUNT(*) as count FROM message_logs WHERE campaign_id = ? GROUP BY status', [c.id]);
                console.log('     Logs Statuses (message_logs):');
                if (logsCount.length === 0) {
                    console.log('       No message_logs entries.');
                } else {
                    logsCount.forEach(l => {
                        console.log(`       * ${l.status}: ${l.count}`);
                    });
                }
                console.log('   -----------------------------------');
            }
        }

        // 2. Check SMS Gateways and Assignments for User 63 (from logs)
        console.log('\n⚙️ SMS GATEWAYS & USER ASSIGNMENT:');
        const [gateways] = await query('SELECT id, name, status, primary_url, sender_id FROM sms_gateways');
        console.log('   All Configured SMS Gateways in DB:');
        gateways.forEach(g => {
            console.log(`   - ID: ${g.id} | Name: ${g.name} | Status: ${g.status} | SenderID: ${g.sender_id}`);
            console.log(`     URL: ${g.primary_url.substring(0, 100)}...`);
        });

        const targetUserId = camps.length > 0 ? camps[0].user_id : 63;
        const [userRows] = await query('SELECT id, name, email, sms_gateway_id, pe_id, hash_id FROM users WHERE id = ?', [targetUserId]);
        if (userRows.length > 0) {
            const u = userRows[0];
            console.log(`\n   User Assignment (User ID: ${u.id} - ${u.name}):`);
            console.log(`     Assigned Gateway ID: ${u.sms_gateway_id}`);
            console.log(`     PE ID: ${u.pe_id}`);
            console.log(`     Hash ID: ${u.hash_id}`);
        } else {
            console.log(`\n   User ID ${targetUserId} not found in database.`);
        }

        // 3. General Queue Summary (All running/pending items)
        console.log('\n📊 GENERAL QUEUE SUMMARY (ALL CAMPAIGNS):');
        const [allQueue] = await query('SELECT status, COUNT(*) as count FROM campaign_queue GROUP BY status');
        allQueue.forEach(q => {
            console.log(`   * Status ${q.status}: ${q.count} items`);
        });

    } catch (err) {
        console.error('❌ Diagnostics Error:', err.message);
    } finally {
        process.exit();
    }
}

diagnose();
