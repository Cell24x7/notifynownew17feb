require('dotenv').config();
const { query } = require('../config/db');

async function testStats() {
    try {
        console.log('Testing Channel Stats Logic...');

        // 1. Simulate DB Query (Same as in stats.js)
        const [channelStats] = await query(`
            SELECT channel, SUM(audience_count) as volume
            FROM campaigns 
            WHERE status IN ('completed', 'running')
            GROUP BY channel
        `);

        console.log('Raw DB Result:', channelStats);

        const allChannels = ['whatsapp', 'sms', 'email', 'rcs', 'instagram', 'facebook'];

        // Logic from stats.js
        const totalVolume = channelStats.reduce((acc, curr) => acc + Number(curr.volume || 0), 0) || 1;

        const channelUsage = allChannels.map(channelName => {
            const found = channelStats.find(c => c.channel.toLowerCase() === channelName.toLowerCase());
            const volume = found ? Number(found.volume || 0) : 0;

            return {
                channel: channelName,
                messages: volume,
                percentage: Math.round((volume / totalVolume) * 100)
            };
        });

        console.log('Processed Channel Usage:', channelUsage);
        console.log('Total Volume:', totalVolume);

        const totalPercentage = channelUsage.reduce((acc, curr) => acc + curr.percentage, 0);
        console.log('Total Percentage Sum:', totalPercentage + '%');

        process.exit(0);
    } catch (err) {
        console.error('Test Failed:', err);
        process.exit(1);
    }
}

testStats();
