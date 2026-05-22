const path = require('path');
const dotenv = require('dotenv');

// Load environment config
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
dotenv.config({ path: path.join(__dirname, '..', envFile) });

const { query } = require('../config/db');

async function run() {
    try {
        console.log('Querying campaign details...');
        const [campaigns] = await query(`
            SELECT id, name, recipient_count, sent_count, delivered_count, read_count, failed_count
            FROM campaigns
            WHERE name LIKE 'Pothys - 22 May 2026%'
            ORDER BY name
        `);
        
        console.log('Found campaigns:', campaigns.length);
        
        const results = [];
        for (const camp of campaigns) {
            const [channelStats] = await query(`
                SELECT channel, status, COUNT(*) as count 
                FROM message_logs 
                WHERE campaign_id = ? 
                GROUP BY channel, status
            `, [camp.id]);
            
            const breakdown = {};
            for (const stat of channelStats) {
                const chan = (stat.channel || '').toLowerCase();
                const status = (stat.status || '').toLowerCase();
                const count = parseInt(stat.count || 0, 10);
                
                if (!breakdown[chan]) {
                    breakdown[chan] = { sent: 0, delivered: 0, read: 0, failed: 0, details: {} };
                }
                
                breakdown[chan].details[status] = (breakdown[chan].details[status] || 0) + count;
                
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
            
            results.push({
                id: camp.id,
                name: camp.name,
                total: camp.recipient_count,
                sent: camp.sent_count,
                delivered: camp.delivered_count,
                read: camp.read_count,
                failed: camp.failed_count,
                breakdown
            });
        }
        
        console.log(JSON.stringify(results, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();
