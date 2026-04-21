require('dotenv').config();
const { query } = require('../config/db');

async function test() {
    try {
        console.log('--- TICKETS COUNT ---');
        const [ticks] = await query('SELECT COUNT(*) as count FROM tickets');
        console.log('Total Tickets:', ticks[0].count);

        console.log('\n--- TICKETS SAMPLE ---');
        const [sample] = await query('SELECT * FROM tickets LIMIT 5');
        console.log(sample);

        console.log('\n--- ADMIN USER ROLES ---');
        const [admins] = await query("SELECT id, email, role FROM users WHERE role LIKE '%admin%'");
        console.log(admins);

        console.log('\n--- CHECKING TICKETS JOIN ---');
        const [joined] = await query(`
            SELECT t.id, t.subject, u.name as user_name 
            FROM tickets t 
            JOIN users u ON t.user_id = u.id 
            LIMIT 5
        `);
        console.log(joined);

    } catch (e) {
        console.error('DB TEST ERROR:', e.message);
    } finally {
        process.exit();
    }
}

test();
