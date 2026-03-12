
require('dotenv').config({ path: './.env' });
const { query } = require('./config/db');

async function check() {
    const [rows] = await query("SELECT id, name, keywords FROM chat_flows WHERE user_id = 34 AND status = 'active'");
    for (const row of rows) {
        let kws = [];
        try {
            kws = typeof row.keywords === 'string' ? JSON.parse(row.keywords) : row.keywords;
        } catch (e) {}
        
        console.log(`Checking Flow ID: ${row.id} (${row.name})`);
        console.log(`Keywords: ${JSON.stringify(kws)}`);
        
        const message = "know more";
        const matched = kws.some(kw => 
            message.trim().toLowerCase().includes(kw.toLowerCase()) ||
            message.trim().toLowerCase() === kw.toLowerCase()
        );
        
        if (matched) {
            console.log(`!!! MATCHED CURRENT FLOW !!!`);
        }
    }
    process.exit(0);
}
check();
