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

        const testT = toDelete[0];
        console.log(`\n🧪 Diagnostic Test: Attempting delete of template [${testT.template_name}]...`);

        const deleteEndpoints = [
            { method: 'POST', url: `https://wa20.nuke.co.in/webhook/api/deleteTemplates.php`, type: 'urlencoded', data: { username: config.customer_id, template_name: testT.template_name, name: testT.template_name } },
            { method: 'DELETE', url: `https://wa20.nuke.co.in/webhook/api/templates.php?username=${config.customer_id}&template_name=${testT.template_name}`, type: 'query' },
            { method: 'DELETE', url: `https://wa20.nuke.co.in/webhook/api/templates.php?username=${config.customer_id}&name=${testT.template_name}`, type: 'query' },
            { method: 'POST', url: `https://wa20.nuke.co.in/v6/api/whatsappTemplate/24/${config.customer_id}/deleteTemplate`, type: 'json', data: { template_name: testT.template_name } },
            { method: 'POST', url: `https://wa20.nuke.co.in/v6/api/whatsappTemplate/24/${config.customer_id}/delete`, type: 'json', data: { template_name: testT.template_name } },
            { method: 'POST', url: `https://wa20.nuke.co.in/webhook/api/deleteTemplate.php`, type: 'urlencoded', data: { username: config.customer_id, template_name: testT.template_name } },
            { method: 'POST', url: `https://wa20.nuke.co.in/webhook/api/templates.php`, type: 'urlencoded', data: { username: config.customer_id, action: 'delete', template_name: testT.template_name } }
        ];

        let workingEndpoint = null;

        for (const ep of deleteEndpoints) {
            try {
                let res;
                const headers = { 'Authorization': `Bearer ${config.wa_token}` };
                
                if (ep.type === 'urlencoded') {
                    headers['Content-Type'] = 'application/x-www-form-urlencoded';
                    const formData = new URLSearchParams();
                    Object.keys(ep.data).forEach(k => formData.append(k, ep.data[k]));
                    res = await axios.post(ep.url, formData.toString(), { headers });
                } else if (ep.type === 'json') {
                    headers['Content-Type'] = 'application/json';
                    res = await axios.post(ep.url, ep.data, { headers });
                } else {
                    res = await axios.delete(ep.url, { headers });
                }

                console.log(`✅ [${ep.method} ${ep.url}] -> Success! Response:`, JSON.stringify(res.data));
                workingEndpoint = ep;
                break;
            } catch (err) {
                console.log(`❌ [${ep.method} ${ep.url}] -> ${err.response ? err.response.status + ' ' + JSON.stringify(err.response.data) : err.message}`);
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
