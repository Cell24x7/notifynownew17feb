require('dotenv').config({ path: __dirname + '/../.env.production' });
require('dotenv').config({ path: __dirname + '/../.env' });
const { query } = require('../config/db');

async function setupEdplGateway() {
    try {
        const userEmail = process.argv[2];
        if (!userEmail) {
            console.error('❌ Please provide the user email! Usage: node backend/scripts/setup_edpl.js <user_email>');
            process.exit(1);
        }

        console.log(`🔍 Finding user: ${userEmail}...`);
        const [users] = await query('SELECT id, name FROM users WHERE email = ?', [userEmail]);
        if (users.length === 0) {
            console.error('❌ User not found!');
            process.exit(1);
        }
        const userId = users[0].id;

        console.log(`🛠️ Creating EDPL Gateway config...`);
        // We set api_user/api_password empty because EDPL uses Bearer API Key (if any)
        const [insertResult] = await query(`
            INSERT INTO voice_configs (name, api_user, api_password, provider, base_url, api_key, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, ['EDPL Bulk Gateway', '', '', 'edpl', 'https://callcenter-edpl.onrender.com', 'YOUR_API_KEY_HERE', 'active']);
        
        const configId = insertResult.insertId;
        console.log(`✅ EDPL Gateway created with ID: ${configId}`);

        console.log(`🔗 Assigning Gateway to User ${users[0].name}...`);
        await query('UPDATE users SET ai_voice_config_id = ? WHERE id = ?', [configId, userId]);
        
        console.log(`🎉 Success! EDPL Gateway assigned to ${users[0].name} (${userEmail}).`);
        console.log(`➡️ Now they can create a Voice Campaign from UI and it will use EDPL!`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

setupEdplGateway();
