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

        // Batch test parameter names for Nuke createTemplates.php
        const buttonUrl = 'https://www.instagram.com/indianprincess.stores?igsh=YWw3bWVrOTNyb3Bo';
        const buttonLabel = '📸 Follow Us';

        const tests = [
            {
                name: 't1_qr_btn_texts',
                payload: {
                    quick_reply_btn_text1: 'Track Order',
                    quick_reply_btn_text2: 'Contact Support'
                }
            },
            {
                name: 't2_visit_website1',
                payload: {
                    button_type_set: 'call_to_action',
                    visit_website1_text: buttonLabel,
                    visit_website1_url: buttonUrl,
                    visit_website_btn_text: buttonLabel,
                    visit_website_url_text: buttonUrl
                }
            },
            {
                name: 't3_url_button_text_url',
                payload: {
                    button_type_set: 'call_to_action',
                    url_button_text: buttonLabel,
                    url_button_url: buttonUrl,
                    website_button_text: buttonLabel,
                    website_url: buttonUrl
                }
            },
            {
                name: 't4_button1_type_text_url',
                payload: {
                    button_type: 'call_to_action',
                    button1_type: 'URL',
                    button1_text: buttonLabel,
                    button1_url: buttonUrl
                }
            }
        ];

        console.log(`\n🧪 Testing ${tests.length} Nuke parameter name variations...`);

        for (let i = 0; i < tests.length; i++) {
            const t = tests[i];
            const tName = `indianprincess_param_${Date.now().toString().slice(-3)}_${i+1}`;

            const fullPayload = {
                username: config.customer_id,
                customer_id: config.customer_id,
                template_name: tName,
                category: 'utility',
                language: 14,
                header_area_type: 'none',
                header_media_type: '',
                template_body: 'Dear {{1}}, Your voucher password is {{2}} Indian Princess',
                template_footer: '',
                ...t.payload
            };

            const createUrl = `https://wa20.nuke.co.in/webhook/api/createTemplates.php?username=${config.customer_id}`;
            const formData = new URLSearchParams();
            Object.keys(fullPayload).forEach(k => {
                const val = fullPayload[k];
                if (val !== undefined && val !== null) formData.append(k, val);
            });

            try {
                const res = await axios.post(createUrl, formData.toString(), {
                    headers: { 'Authorization': `Bearer ${config.wa_token}`, 'Content-Type': 'application/x-www-form-urlencoded' }
                });
                console.log(`[Test ${i+1}: ${t.name}] -> Success (ID: ${res.data.template_id})`);
            } catch (err) {
                console.log(`[Test ${i+1}: ${t.name}] -> Failed:`, err.message);
            }
        }

        const listUrl = `https://wa20.nuke.co.in/webhook/api/templates.php?username=${config.customer_id}`;
        const listRes = await axios.get(listUrl, { headers: { 'Authorization': `Bearer ${config.wa_token}` } });
        const list = listRes.data.data || listRes.data || [];
        
        const recent4 = list.slice(-4);
        console.log(`\n📊 RESULTS OF 4 TEST VARIATIONS IN NUKE DB:`);
        recent4.forEach(t => {
            console.log(`\n📌 Template: ${t.template_name} (ID: ${t.id})`);
            console.log(`   quick_replies:          ${t.quick_replies}`);
            console.log(`   button_type_set:        ${t.button_type_set}`);
            console.log(`   call_action_type_set1:  ${t.call_action_type_set1}`);
            console.log(`   visit_website_btn_text: ${t.visit_website_btn_text}`);
            console.log(`   visit_website_url_text: ${t.visit_website_url_text}`);
            console.log(`   call_phone_btn_text:    ${t.call_phone_btn_text}`);
        });

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
