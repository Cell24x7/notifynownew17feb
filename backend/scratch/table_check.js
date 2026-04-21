require('dotenv').config();
const { query } = require('../config/db');

async function test() {
    try {
        console.log('--- TABLES ---');
        const [tables] = await query('SHOW TABLES');
        console.log(tables);

        console.log('\n--- TICKETS TABLE STRUCTURE ---');
        try {
            const [cols] = await query('DESCRIBE tickets');
            console.log(cols);
        } catch (e) {
            console.log('Tickets table might not exist or has another name');
        }

    } catch (e) {
        console.error('DB TEST ERROR:', e.message);
    } finally {
        process.exit();
    }
}

test();
