const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Load environment variables from .env.production or .env
const envPath = fs.existsSync(path.join(__dirname, '../.env.production'))
    ? path.join(__dirname, '../.env.production')
    : path.join(__dirname, '../.env');

dotenv.config({ path: envPath });

const axios = require('axios');
const { query } = require('../config/db');

async function testNukeCreate() {
    try {
        console.log('🔍 Searching for userindp or indian princess config in database...');
        
        // 1. Find user or WA config specifically for indian princess / userindp
        const [users] = await query(
            "SELECT u.id, u.email, u.name, u.whatsapp_config_id, wc.* FROM users u JOIN whatsapp_configs wc ON u.whatsapp_config_id = wc.id WHERE u.email LIKE '%indp%' OR u.name LIKE '%indp%' OR u.email LIKE '%indian%' OR wc.chatbot_name LIKE '%indian%' OR wc.chatbot_name LIKE '%princess%' ORDER BY CASE WHEN u.email LIKE '%indp%' OR u.name LIKE '%indp%' THEN 1 ELSE 2 END LIMIT 5"
        );

        if (!users || users.length === 0) {
            console.error('❌ User or WA20 config not found in DB! Searching all whatsapp_configs...');
            const [allConfigs] = await query("SELECT id, chatbot_name, customer_id, wa_token FROM whatsapp_configs");
            console.log('Available Configs:', JSON.stringify(allConfigs, null, 2));
            process.exit(1);
        }

        console.log(`📋 Found ${users.length} matching accounts:`);
        users.forEach((u, i) => console.log(`  [${i+1}] User: ${u.email} | Name: ${u.name} | Chatbot: ${u.chatbot_name} | Customer ID: ${u.customer_id}`));

        const config = users[0];
        console.log(`\n✅ Using Target Account: [${config.email}] | Chatbot: [${config.chatbot_name}] | Customer ID: [${config.customer_id}]`);

        // 2. Prepare Template Payload for Nuke API
        const templateName = `indianprincess_test_btn_${Date.now().toString().slice(-4)}`;
        const bodyText = 'Dear {{1}}, Your one time password for Voucher issue is {{2}} Indian Princess';
        const buttonUrl = 'https://www.instagram.com/indianprincess.stores?igsh=YWw3bWVrOTNyb3Bo';
        const buttonLabel = '📸 Follow Us';

        const ctaButtons = [
            {
                type: 'URL',
                text: buttonLabel,
                displayText: buttonLabel,
                label: buttonLabel,
                url: buttonUrl,
                value: buttonUrl
            }
        ];

        const wa20Payload = {
            username: config.customer_id,
            customer_id: config.customer_id,
            template_name: templateName,
            category: 'utility',
            language: 14, // 14 = English
            header_area_type: 'none',
            header_media_type: '',
            template_body: bodyText,
            template_footer: '',
            
            // 🎯 NUKE SPECIFIC BUTTON FIELDS DISCOVERED FROM NUKE DB COLUMNS:
            visit_website_btn_text: buttonLabel,
            visit_website_url_text: buttonUrl,
            visit_website_url_set: 'static',
            call_action_type_set1: 'VISIT_WEBSITE',

            // Also keep standard arrays & JSON strings
            call_to_action_buttons: ctaButtons,
            call_to_action: JSON.stringify(ctaButtons),
            buttons: ctaButtons,
            actions: JSON.stringify(ctaButtons)
        };

        console.log('\n📤 Sending createTemplates payload to Nuke API (x-www-form-urlencoded)...');
        console.log(JSON.stringify(wa20Payload, null, 2));

        const createUrl = `https://wa20.nuke.co.in/webhook/api/createTemplates.php?username=${config.customer_id}`;
        
        // 🎯 PHP $_POST FIX: Send as x-www-form-urlencoded
        const formData = new URLSearchParams();
        Object.keys(wa20Payload).forEach(key => {
            const val = wa20Payload[key];
            formData.append(key, typeof val === 'object' ? JSON.stringify(val) : val);
        });

        const response = await axios.post(createUrl, formData.toString(), {
            headers: {
                'Authorization': `Bearer ${config.wa_token}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        console.log('\n📥 Nuke API Response:', JSON.stringify(response.data, null, 2));

        // 3. Verify template list from Nuke
        console.log('\n🔍 Verifying registered template from Nuke templates list API...');
        const listUrl = `https://wa20.nuke.co.in/webhook/api/templates.php?username=${config.customer_id}`;
        const listHeaders = { 'Authorization': `Bearer ${config.wa_token}` };
        const listRes = await axios.get(listUrl, { headers: listHeaders });
        
        const templates = listRes.data.data || listRes.data || [];
        const created = templates.find(t => t.template_name === templateName || t.name === templateName);

        if (created) {
            console.log('\n🎉 FOUND CREATED TEMPLATE IN NUKE LIST:');
            console.log(JSON.stringify(created, null, 2));
        } else {
            console.log(`\n📋 Nuke returned ${templates.length} templates. Latest 2 templates:`);
            console.log(JSON.stringify(templates.slice(-2), null, 2));
        }

    } catch (error) {
        console.error('❌ Error testing Nuke create:', error.response ? error.response.data : error.message);
    } finally {
        process.exit(0);
    }
}

testNukeCreate();
