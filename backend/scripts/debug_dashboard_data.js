require('dotenv').config();
const { query } = require('../config/db');

async function debugData() {
    try {
        console.log('--- Debugging Data for Dashboard ---');

        const [userMonths] = await query(`
            SELECT DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as count 
            FROM users 
            GROUP BY month 
            ORDER BY month DESC
        `);
        console.log('User Growth by Month:', userMonths);

        const [txMonths] = await query(`
            SELECT DATE_FORMAT(created_at, '%Y-%m') as month, SUM(amount) as revenue 
            FROM transactions 
            WHERE type = 'credit'
            GROUP BY month 
            ORDER BY month DESC
        `);
        console.log('Revenue by Month:', txMonths);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

debugData();
