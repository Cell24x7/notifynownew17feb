const fs = require('fs');
const path = require('path');

// Load .env
const envPath = path.join(__dirname, './backend/.env');
if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            process.env[parts[0].trim()] = parts.slice(1).join('=').trim();
        }
    });
}

const { query } = require('./backend/config/db');

async function setup() {
    try {
        const userId = 34;
        console.log('--- Starting TGE Demo Setup for User 34 ---');

        // 1. Templates
        const templates = [
            {
                id: 'tpl_tge_welcome',
                name: 'tge_welcome_intro',
                body: 'Hello 👋 Welcome to *The Great Escape Water Park*! 🌊\n\nWe are excited to help you plan a splashy, fun-filled day. How can I assist you today?',
                channel: 'whatsapp',
                category: 'MARKETING',
                buttons: [
                    { label: 'I want to know more 😎', value: 'tge_know_more' },
                    { label: 'Book Now 🎟️', value: 'tge_book_now' }
                ]
            },
            {
                id: 'tpl_tge_more_info',
                name: 'tge_more_info',
                body: 'Awesome! Here are our latest details at TGE Water Park:\n\n🌊 18+ Thrilling Rides\n🍕 45+ Delicious Food options\n💥 Best weekend offers!',
                channel: 'whatsapp',
                category: 'UTILITY',
                buttons: [
                    { label: 'Offers & Deals 💥', value: 'tge_offers' },
                    { label: 'Ticket Price 🎟', value: 'tge_tickets' }
                ]
            }
        ];

        for (const t of templates) {
            await query('DELETE FROM template_buttons WHERE template_id = ?', [t.id]);
            await query('DELETE FROM message_templates WHERE id = ?', [t.id]);
            await query(
                'INSERT INTO message_templates (id, user_id, name, channel, category, template_type, body, status, language) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [t.id, userId, t.name, t.channel, t.category, 'standard', t.body, 'approved', 'en_US']
            );
            for (let i = 0; i < t.buttons.length; i++) {
                const b = t.buttons[i];
                await query(
                    'INSERT INTO template_buttons (id, template_id, type, label, value, position) VALUES (?, ?, ?, ?, ?, ?)',
                    [`btn_${t.id}_${i}`, t.id, 'quick_reply', b.label, b.value, i]
                );
            }
            console.log(`✅ Template created: ${t.name}`);
        }

        // 2. Chatflows
        const flows = [
            {
                name: 'TGE Step 1: Welcome',
                keywords: ['hi', 'hello', 'tge'],
                body: 'Welcome to TGE!',
                footer: {
                    footerType: 'new_option',
                    interactiveType: 'Button',
                    customButtons: [
                        { label: 'I want to know more 😎', keyword: 'tge_know_more' },
                        { label: 'Book Now 🎟️', keyword: 'tge_book_now' }
                    ],
                    selectedTopics: [],
                    customList: {}
                }
            },
            {
                name: 'TGE Step 2: Info Menu',
                keywords: ['tge_know_more'],
                body: 'Info Menu triggered.',
                footer: {
                    footerType: 'new_option',
                    interactiveType: 'Button',
                    customButtons: [
                        { label: 'Offers & Deals 💥', keyword: 'tge_offers' },
                        { label: 'Ticket Price 🎟', keyword: 'tge_tickets' }
                    ],
                    selectedTopics: [],
                    customList: {}
                }
            }
        ];

        await query('DELETE FROM chat_flows WHERE user_id = ? AND name LIKE "TGE Step%"', [userId]);

        for (const f of flows) {
            await query(
                'INSERT INTO chat_flows (user_id, name, category, keywords, body, footer_config, logic_config, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [userId, f.name, 'Automation', JSON.stringify(f.keywords), f.body, JSON.stringify(f.footer), JSON.stringify({ getUserInput: true }), 'active']
            );
            console.log(`✅ Flow created: ${f.name}`);
        }

        console.log('--- Setup Finished Successfully ---');
        process.exit(0);
    } catch (err) {
        console.error('❌ Setup Failed:', err);
        process.exit(1);
    }
}

setup();
