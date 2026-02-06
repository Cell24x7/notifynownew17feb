require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { query } = require('../config/db');

async function checkData() {
    try {
        const [rows] = await query('SELECT COUNT(*) as count FROM campaigns');
        console.log('Campaign Count:', rows[0].count);

        const [statuses] = await query('SELECT DISTINCT status FROM campaigns');
        console.log('Statuses:', statuses.map(s => s.status));

        const [channels] = await query('SELECT DISTINCT channel FROM campaigns');
        console.log('Channels:', channels.map(c => c.channel));

        const [sample] = await query('SELECT * FROM campaigns LIMIT 1');
        console.log('Sample Campaign:', sample[0]);
    } catch (err) {
        console.error('Query failed:', err);
    }
    process.exit();
}

checkData();
