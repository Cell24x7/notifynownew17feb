
require('dotenv').config({ path: './.env' });
const { query } = require('./config/db');

async function run() {
    try {
        const [rows] = await query("SELECT id, name, keywords, status, body FROM chat_flows WHERE user_id = 34");
        for (const row of rows) {
            console.log(`--- FLOW ---`);
            console.log(`ID: ${row.id} | Status: ${row.status}`);
            console.log(`Name: ${row.name}`);
            console.log(`Keywords: ${row.keywords}`);
            // console.log(`Body: ${row.body.substring(0, 50)}...`);
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
run();
