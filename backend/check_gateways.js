require('dotenv').config({path: './.env'});
const { query } = require('./config/db');

async function check() {
    try {
        const [rows] = await query('SELECT * FROM sms_gateways');
        console.log('--- GATEWAYS ---');
        rows.forEach(r => {
            console.log(`ID: ${r.id}, Name: ${r.name}`);
            console.log(`Primary URL: ${r.primary_url}`);
            console.log(`---`);
        });
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
check();
