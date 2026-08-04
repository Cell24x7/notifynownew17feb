const axios = require('axios');
const { query } = require('../config/db');

async function testNukeCreate() {
    try {
        console.log('🔍 Searching for userindp or indian princess config in database...');
        
        // 1. Find user or WA config
        const [users] = await query(
            "SELECT u.id, u.email, u.name, u.whatsapp_config_id, wc.* FROM users u JOIN whatsapp_configs wc ON u.whatsapp_config_id = wc.id WHERE u.email LIKE '%indp%' OR u.name LIKE '%indp%' OR u.email LIKE '%indian%' OR wc.chatbot_name LIKE '%indian%' OR wc.customer_id IS NOT NULL LIMIT 1"
        );

        if (!users || users.length === 0) {
            console.error('❌ User or WA20 config not found in DB!');
            process.exit(1);
        }

        const config = users[0];
        console.log(`✅ Found User: [${config.email}] | Chatbot: [${config.chatbot_name}] | Customer ID: [${config.customer_id}]`);

        // 2. Prepare Template Payload for Nuke API
        const templateName = `indianprincess_test_btn_${Date.now().toString().slice(-4)}`;
        const bodyText = 'Dear {{1}}, Your one time password for Voucher issue is {{2}} Indian Princess';
        const ctaButtons = [
            {
                type: 'URL',
                text: 'Follow Us',
                displayText: 'Follow Us',
                label: 'Follow Us',
                url: 'https://www.instagram.com/indianprincess.stores',
                value: 'https://www.instagram.com/indianprincess.stores'
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
            call_to_action_buttons: ctaButtons,
            call_to_action: JSON.stringify(ctaButtons),
            buttons: ctaButtons,
            actions: JSON.stringify(ctaButtons)
        };

        console.log('\n📤 Sending createTemplates payload to Nuke API...');
        console.log(JSON.stringify(wa20Payload, null, 2));

        const createUrl = `https://wa20.nuke.co.in/webhook/api/createTemplates.php?username=${config.customer_id}`;
        const headers = {
            'Authorization': `Bearer ${config.wa_token}`,
            'Content-Type': 'application/json'
        };

        const response = await axios.post(createUrl, wa20Payload, { headers });
        console.log('\n📥 Nuke API Response:', JSON.stringify(response.data, null, 2));

        // 3. Verify template list from Nuke
        console.log('\n🔍 Verifying registered template from Nuke templates list API...');
        const listUrl = `https://wa20.nuke.co.in/webhook/api/templates.php?username=${config.customer_id}`;
        const listRes = await axios.get(listUrl, { headers });
        
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
