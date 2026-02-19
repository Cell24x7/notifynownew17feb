const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { query } = require('../config/db');

(async () => {
    try {
        console.log('--- CAMPAIGNS (Specific) ---');
        // Check the latest campaign or the one mentioned
        const [campaigns] = await query('SELECT * FROM campaigns ORDER BY created_at DESC LIMIT 1');
        console.log(JSON.stringify(campaigns, null, 2));

        if (campaigns && campaigns.length > 0) {
            const c = campaigns[0];
            console.log('Template ID:', c.template_id);
            console.log('Template Name:', c.template_name);
        } else {
            console.log('No campaigns found.');
        }

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();
