const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { query } = require('../config/db');

const checkLatestTemplate = async () => {
    try {
        console.log('🔍 Checking latest RCS Template...');
        const [templates] = await query('SELECT * FROM rcs_templates ORDER BY created_at DESC LIMIT 3');

        if (templates.length > 0) {
            console.log(`✅ Found ${templates.length} recent templates:`);
            templates.forEach((t, index) => {
                console.log(`\n[${index + 1}] ID: ${t.id}`);
                console.log(`    Name: ${t.name}`);
                console.log(`    Status: ${t.status}`);
                console.log(`    Created At: ${t.created_at ? new Date(t.created_at).toISOString() : 'NULL'}`);
            });
        } else {
            console.log('❌ No templates found.');
        }
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
};

checkLatestTemplate();
