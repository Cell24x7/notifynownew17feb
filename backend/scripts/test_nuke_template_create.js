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

        // Test sending URL button in quick_replies column
        const buttonUrl = 'https://www.instagram.com/indianprincess.stores?igsh=YWw3bWVrOTNyb3Bo';
        const buttonLabel = '📸 Follow Us';

        const urlBtnObj = [
            {
                type: 'URL',
                text: buttonLabel,
                url: buttonUrl
            }
        ];

        const testName = `indianprincess_url_qr_${Date.now().toString().slice(-4)}`;
        
        const payload = {
            username: config.customer_id,
            customer_id: config.customer_id,
            template_name: testName,
            category: 'utility',
            language: 14,
            header_area_type: 'none',
            header_media_type: '',
            template_body: 'Dear {{1}}, Your voucher password is {{2}} Indian Princess',
            template_footer: '',
            quick_replies: JSON.stringify(urlBtnObj),
            call_to_action: JSON.stringify(urlBtnObj),
            buttons: JSON.stringify(urlBtnObj)
        };

        console.log('\n📤 Testing quick_replies with URL type object payload...');
        const createUrl = `https://wa20.nuke.co.in/webhook/api/createTemplates.php?username=${config.customer_id}`;
        
        const formData = new URLSearchParams();
        Object.keys(payload).forEach(k => {
            const val = payload[k];
            if (val !== undefined && val !== null) formData.append(k, val);
        });

        const res = await axios.post(createUrl, formData.toString(), {
            headers: { 'Authorization': `Bearer ${config.wa_token}`, 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        console.log('📥 Nuke API Response:', JSON.stringify(res.data, null, 2));

        const listUrl = `https://wa20.nuke.co.in/webhook/api/templates.php?username=${config.customer_id}`;
        const listRes = await axios.get(listUrl, { headers: { 'Authorization': `Bearer ${config.wa_token}` } });
        const list = listRes.data.data || listRes.data || [];
        const newlyCreated = list.find(t => t.id === res.data.template_id || t.template_name === testName);

        console.log(`\n🎉 NEWLY CREATED TEMPLATE [${testName}] FROM NUKE DB:`);
        console.log(JSON.stringify(newlyCreated || list[list.length - 1], null, 2));

        const withButtons = list.filter(t => 
            t.button_type_set || 
            t.visit_website_btn_text || 
            t.call_phone_btn_text || 
            (t.quick_replies && t.quick_replies !== '[]') ||
            t.carousels || t.flow
        );

        console.log(`\n🎯 Found ${withButtons.length} templates with buttons/interactivity in Nuke DB!`);
        withButtons.forEach((tb, idx) => {
            console.log(`\n📄 Button Template #${idx+1} [${tb.template_name}] (ID: ${tb.id}):`);
            console.log(JSON.stringify(tb, null, 2));
        });

    } catch (error) {
        console.error('❌ Error testing Nuke create:', error.response ? error.response.data : error.message);
    } finally {
        process.exit(0);
    }
}

testNukeCreate();
