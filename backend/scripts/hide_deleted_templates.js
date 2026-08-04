const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

const envPath = fs.existsSync(path.join(__dirname, '../.env.production'))
    ? path.join(__dirname, '../.env.production')
    : path.join(__dirname, '../.env');

dotenv.config({ path: envPath });

const axios = require('axios');
const { query } = require('../config/db');

async function hideDeleted() {
    try {
        console.log('🔍 Creating deleted_whatsapp_templates table if not exists...');
        await query(
            "CREATE TABLE IF NOT EXISTS deleted_whatsapp_templates (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT, template_name VARCHAR(255), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY user_tpl (user_id, template_name));"
        );

        console.log('🔍 Finding userindp user ID...');
        const [users] = await query(
            "SELECT u.id, u.email, u.name, u.whatsapp_config_id, wc.customer_id, wc.wa_token FROM users u JOIN whatsapp_configs wc ON u.whatsapp_config_id = wc.id WHERE u.email LIKE '%indp%' OR u.name LIKE '%indp%' OR u.email LIKE '%indian%' OR wc.chatbot_name LIKE '%indian%' OR wc.chatbot_name LIKE '%princess%' ORDER BY CASE WHEN u.email LIKE '%indp%' OR u.name LIKE '%indp%' THEN 1 ELSE 2 END LIMIT 1"
        );

        if (!users || users.length === 0) {
            console.error('❌ User not found!');
            process.exit(1);
        }

        const user = users[0];
        console.log(`✅ User ID: [${user.id}] | Email: [${user.email}] | Customer ID: [${user.customer_id}]`);

        // Fetch templates from Nuke API
        const listUrl = `https://wa20.nuke.co.in/webhook/api/templates.php?username=${user.customer_id}`;
        const listRes = await axios.get(listUrl, { headers: { 'Authorization': `Bearer ${user.wa_token}` } });
        const templates = listRes.data.data || listRes.data || [];

        // Identify test / rejected / unapproved templates to hide
        const testTemplateNames = templates
            .filter(t => 
                t.status === 2 || // REJECTED / FAILED
                t.template_name.includes('test') || 
                t.template_name.includes('param') || 
                t.template_name.includes('url_qr') ||
                t.template_name.startsWith('indianprincess_t_') ||
                t.template_name === 'password_for_voucher' ||
                t.template_name === 'gift_voucher' ||
                t.template_name === 'thank_you_for_shopping' ||
                t.template_name === 'testing_message_001' ||
                t.template_name === 'indianprincess_voucher_otp' ||
                t.template_name === 'indianprincess_voucher_otp_second'
            )
            .map(t => t.template_name);

        console.log(`\n🙈 Adding ${testTemplateNames.length} deleted/rejected template names to hidden list in DB...`);

        let count = 0;
        for (const tName of testTemplateNames) {
            try {
                await query(
                    "INSERT INTO deleted_whatsapp_templates (user_id, template_name) VALUES (?, ?) ON DUPLICATE KEY UPDATE created_at = CURRENT_TIMESTAMP",
                    [user.id, tName]
                );
                console.log(`  🙈 Hidden: [${tName}]`);
                count++;
            } catch (e) {
                console.error(`  ❌ Error hiding ${tName}:`, e.message);
            }
        }

        console.log(`\n🎉 Successfully hidden ${count} / ${testTemplateNames.length} templates for user ${user.email}!`);

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        process.exit(0);
    }
}

hideDeleted();
