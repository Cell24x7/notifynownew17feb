const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

const envPath = fs.existsSync(path.join(__dirname, '../.env.production'))
    ? path.join(__dirname, '../.env.production')
    : path.join(__dirname, '../.env');

dotenv.config({ path: envPath });

const axios = require('axios');
const { query } = require('../config/db');

async function syncAllWA20Templates() {
    console.log('🔄 Starting Full WhatsApp 2.0 Templates Sync...');
    try {
        const [configs] = await query(
            "SELECT * FROM whatsapp_configs WHERE is_active = 1 AND (provider = 'wa20' OR customer_id IS NOT NULL AND customer_id != '')"
        );

        console.log(`📋 Found ${configs.length} active WA20 configurations to sync.`);

        let totalSynced = 0;

        for (const config of configs) {
            console.log(`\n🔹 Syncing for Chatbot: [${config.chatbot_name}] | Username: [${config.customer_id}] | Config ID: ${config.id}`);

            // Find all users using this config (or user whose direct whatsapp_config_id is this)
            const [users] = await query(
                'SELECT id, name, email FROM users WHERE whatsapp_config_id = ?',
                [config.id]
            );

            // If no direct user found, check user_gateways or assign to admin / config user
            let targetUserIds = users.map(u => u.id);
            if (targetUserIds.length === 0) {
                const [gwUsers] = await query(
                    'SELECT user_id FROM user_gateways WHERE config_id = ? OR gateway_id = ?',
                    [config.id, config.id]
                );
                targetUserIds = gwUsers.map(u => u.user_id);
            }
            if (targetUserIds.length === 0) {
                // Fallback to admin user
                const [adminUser] = await query("SELECT id FROM users WHERE role IN ('superadmin', 'admin') LIMIT 1");
                if (adminUser.length) targetUserIds = [adminUser[0].id];
            }

            console.log(`   Target Users: ${targetUserIds.join(', ') || 'None'}`);

            try {
                const url = `https://wa20.nuke.co.in/webhook/api/templates.php?username=${config.customer_id}`;
                const res = await axios.get(url, {
                    headers: {
                        'Authorization': `Bearer ${config.wa_token || ''}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                });

                const templateList = res.data?.data || res.data || [];
                if (!Array.isArray(templateList)) {
                    console.log(`   ⚠️ No valid template array returned from API`);
                    continue;
                }

                console.log(`   ✅ API returned ${templateList.length} templates.`);

                for (const t of templateList) {
                    const templateName = t.template_name || t.name;
                    if (!templateName) continue;

                    const rawStatus = String(t.status ?? '').trim().toLowerCase();
                    const isApproved = rawStatus === '1' || rawStatus === 'approved' || rawStatus === 'active' || rawStatus === 'y' || t.status === 1;
                    const isRejected = rawStatus === '2' || rawStatus === 'rejected' || rawStatus === 'failed' || t.status === 2;
                    const status = isApproved ? 'approved' : isRejected ? 'rejected' : 'pending';

                    const body = t.template_body || t.body || t.text || t.template_text || t.message || '';
                    const footer = t.template_footer || t.footer || '';

                    let category = 'UTILITY';
                    if (t.category === 1 || t.category === '1' || String(t.category).toLowerCase() === 'marketing') category = 'MARKETING';
                    else if (t.category === 3 || t.category === '3' || String(t.category).toLowerCase() === 'authentication') category = 'AUTHENTICATION';

                    for (const userId of targetUserIds) {
                        const templateId = `WA20_${config.id}_${templateName}`;
                        await query(`
                            INSERT INTO message_templates (
                                id, user_id, whatsapp_config_id, name, language, category, channel,
                                template_type, header_type, body, footer, status, updated_at
                            ) VALUES (?, ?, ?, ?, 'en', ?, 'whatsapp', 'text_message', 'none', ?, ?, ?, NOW())
                            ON DUPLICATE KEY UPDATE
                                status = VALUES(status),
                                body = VALUES(body),
                                footer = VALUES(footer),
                                category = VALUES(category),
                                whatsapp_config_id = VALUES(whatsapp_config_id),
                                updated_at = NOW()
                        `, [templateId, userId, config.id, templateName, category, body, footer, status]);

                        // Also update by name if exists
                        await query(`
                            UPDATE message_templates 
                            SET status = ?, body = ?, footer = ?, category = ?, whatsapp_config_id = ?, updated_at = NOW()
                            WHERE user_id = ? AND name = ? AND channel = 'whatsapp'
                        `, [status, body, footer, category, config.id, userId, templateName]);

                        totalSynced++;
                    }
                }
                console.log(`   ✨ Successfully synced templates for [${config.chatbot_name}]`);
            } catch (apiErr) {
                console.error(`   ❌ Failed to fetch from WA20 for [${config.customer_id}]:`, apiErr.message);
            }
        }

        console.log(`\n🎉 Total Template Records Synced/Updated: ${totalSynced}`);
    } catch (err) {
        console.error('❌ Sync Error:', err.message);
    } finally {
        process.exit(0);
    }
}

syncAllWA20Templates();
