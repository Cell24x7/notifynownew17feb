const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

const envPath = fs.existsSync(path.join(__dirname, '../.env.production'))
    ? path.join(__dirname, '../.env.production')
    : path.join(__dirname, '../.env');

dotenv.config({ path: envPath });

const axios = require('axios');
const { query } = require('../config/db');

async function deleteUnapproved() {
    try {
        console.log('🔍 Fetching userindp credentials...');
        const [users] = await query(
            "SELECT u.id, u.email, u.name, u.whatsapp_config_id, wc.* FROM users u JOIN whatsapp_configs wc ON u.whatsapp_config_id = wc.id WHERE u.email LIKE '%indp%' OR u.name LIKE '%indp%' OR u.email LIKE '%indian%' OR wc.chatbot_name LIKE '%indian%' OR wc.chatbot_name LIKE '%princess%' ORDER BY CASE WHEN u.email LIKE '%indp%' OR u.name LIKE '%indp%' THEN 1 ELSE 2 END LIMIT 1"
        );

        if (!users || users.length === 0) {
            console.error('❌ User not found!');
            process.exit(1);
        }

        const config = users[0];
        console.log(`✅ User: [${config.email}] | Customer ID: [${config.customer_id}]`);

        // Fetch template list from Nuke
        const listUrl = `https://wa20.nuke.co.in/webhook/api/templates.php?username=${config.customer_id}`;
        const listRes = await axios.get(listUrl, { headers: { 'Authorization': `Bearer ${config.wa_token}` } });
        const list = listRes.data.data || listRes.data || [];

        console.log(`\n📋 Total templates found: ${list.length}`);

        // Status 1 = Approved. We delete anything where status !== 1 OR template_name contains 'test', 't_', 'param_', 'url_qr'
        const toDelete = list.filter(t => 
            t.status !== 1 || 
            t.template_name.includes('test') || 
            t.template_name.includes('param') || 
            t.template_name.includes('url_qr') ||
            t.template_name.startsWith('indianprincess_t_')
        );

        console.log(`\n🗑️ Found ${toDelete.length} unapproved/test templates to delete!`);

        let deletedCount = 0;
        for (const t of toDelete) {
            try {
                // Try deleting via Nuke API
                const delUrl = `https://wa20.nuke.co.in/webhook/api/deleteTemplate.php?username=${config.customer_id}&name=${t.template_name}&template_name=${t.template_name}`;
                await axios.delete(delUrl, { headers: { 'Authorization': `Bearer ${config.wa_token}` } });
                console.log(`  ✅ Deleted: [${t.template_name}] (ID: ${t.id}, Status: ${t.status})`);
                deletedCount++;
            } catch (err) {
                // Fallback POST delete
                try {
                    const fallbackUrl = `https://wa20.nuke.co.in/webhook/api/deleteTemplates.php`;
                    await axios.post(fallbackUrl, { username: config.customer_id, template_name: t.template_name }, { headers: { 'Authorization': `Bearer ${config.wa_token}` } });
                    console.log(`  ✅ Deleted (POST): [${t.template_name}]`);
                    deletedCount++;
                } catch (e2) {
                    console.log(`  ❌ Failed to delete [${t.template_name}]:`, err.message);
                }
            }
        }

        console.log(`\n🎉 Successfully deleted ${deletedCount} / ${toDelete.length} templates!`);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        process.exit(0);
    }
}

deleteUnapproved();
