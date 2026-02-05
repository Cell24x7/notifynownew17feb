const { query } = require('../config/db');

async function checkSchema() {
    try {
        console.log('Checking transactions schema...');
        const [rows] = await query('DESCRIBE transactions');
        console.log('Schema:', JSON.stringify(rows, null, 2));

        console.log('Checking users schema...');
        const [userRows] = await query('DESCRIBE users');
        console.log('Users Schema:', JSON.stringify(userRows, null, 2));

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

checkSchema();
