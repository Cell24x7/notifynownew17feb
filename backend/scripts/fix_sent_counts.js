require('dotenv').config();
const { query } = require('../config/db');

async function fixSentCounts() {
    try {
        console.log("Fixing sent_count in campaigns table...");
        const [res1] = await query(`
            UPDATE campaigns 
            SET sent_count = recipient_count 
            WHERE status IN ('sent', 'completed') 
            AND sent_count < recipient_count
        `);
        console.log(`Updated ${res1.affectedRows} manual campaigns.`);

        console.log("Fixing sent_count in api_campaigns table...");
        const [res2] = await query(`
            UPDATE api_campaigns 
            SET sent_count = recipient_count 
            WHERE status IN ('sent', 'completed') 
            AND sent_count < recipient_count
        `);
        console.log(`Updated ${res2.affectedRows} API campaigns.`);

        console.log("Done successfully!");
        process.exit(0);
    } catch (e) {
        console.error("Error updating counts:", e);
        process.exit(1);
    }
}

fixSentCounts();
