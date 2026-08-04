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

        // Test multiple variations to find exact Nuke parameter names/values
        const variations = [
            { name: 'var1_call_to_action_url', button_type_set: 'call_to_action', call_action_type_set1: 'url' },
            { name: 'var2_CTA_VISIT_WEBSITE', button_type_set: 'CALL_TO_ACTION', call_action_type_set1: 'VISIT_WEBSITE' },
            { name: 'var3_cta_website', button_type_set: 'cta', call_action_type_set1: 'website' },
            { name: 'var4_num_1_1', button_type_set: '1', call_action_type_set1: '1' },
            { name: 'var5_custom_url', button_type_set: 'custom', call_action_type_set1: 'url' },
            { name: 'var6_visit_website', button_type_set: 'visit_website', call_action_type_set1: 'static' }
        ];

        console.log(`\n🧪 Testing ${variations.length} Nuke parameter variations to find exact DB match...`);

        const buttonUrl = 'https://www.instagram.com/indianprincess.stores?igsh=YWw3bWVrOTNyb3Bo';
        const buttonLabel = '📸 Follow Us';

        for (let i = 0; i < variations.length; i++) {
            const v = variations[i];
            const testName = `indianprincess_t_${Date.now().toString().slice(-3)}_${i+1}`;
            
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

                button_type_set: v.button_type_set,
                call_action_type_set1: v.call_action_type_set1,
                visit_website_btn_text: buttonLabel,
                visit_website_url_text: buttonUrl,
                visit_website_url_set: 'static',

                call_phone_btn_text: '',
                call_phone_btn_phone_number: '',
                quick_reply_btn_text1: '',

                call_to_action_buttons: [{ type: 'URL', text: buttonLabel, url: buttonUrl }],
                buttons: [{ type: 'URL', text: buttonLabel, url: buttonUrl }]
            };

            const createUrl = `https://wa20.nuke.co.in/webhook/api/createTemplates.php?username=${config.customer_id}`;
            const formData = new URLSearchParams();
            Object.keys(payload).forEach(k => {
                const val = payload[k];
                if (val !== undefined && val !== null) {
                    formData.append(k, typeof val === 'object' ? JSON.stringify(val) : val);
                }
            });

            try {
                const res = await axios.post(createUrl, formData.toString(), {
                    headers: { 'Authorization': `Bearer ${config.wa_token}`, 'Content-Type': 'application/x-www-form-urlencoded' }
                });
                console.log(`\n[Test ${i+1}/${variations.length}: ${v.name}] -> Created (ID: ${res.data.template_id})`);
            } catch (err) {
                console.log(`[Test ${i+1}] Failed:`, err.message);
            }
        }

        console.log('\n🔍 Fetching ALL templates of userindp from Nuke API to find any existing button templates...');
        const listUrl = `https://wa20.nuke.co.in/webhook/api/templates.php?username=${config.customer_id}`;
        const listRes = await axios.get(listUrl, { headers: { 'Authorization': `Bearer ${config.wa_token}` } });
        const list = listRes.data.data || listRes.data || [];
        console.log(`\nTotal templates returned from Nuke: ${list.length}`);

        const withButtons = list.filter(t => 
            t.button_type_set || 
            t.visit_website_btn_text || 
            t.call_phone_btn_text || 
            (t.quick_replies && t.quick_replies !== '[]') ||
            t.carousels || t.flow
        );

        console.log(`\n🎯 Found ${withButtons.length} templates with buttons/interactivity in Nuke DB!`);
        if (withButtons.length > 0) {
            console.log('\n📄 Sample Template with Buttons from Nuke:');
            console.log(JSON.stringify(withButtons[0], null, 2));
        } else {
            console.log('\n📋 Sample Template structure (first template):');
            console.log(JSON.stringify(list[0], null, 2));
        }

    } catch (error) {
        console.error('❌ Error testing Nuke create:', error.response ? error.response.data : error.message);
    } finally {
        process.exit(0);
    }
}

testNukeCreate();
