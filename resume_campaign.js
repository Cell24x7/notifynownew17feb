#!/usr/bin/env node

/**
 * resume_campaign.js
 * Resume/re-trigger a pending unofficial WhatsApp campaign.
 * 
 * Usage:
 *   node resume_campaign.js <campaignId> [imageUrl]
 */

const path = require('path');
const fs = require('fs');
const axios = require('axios');

// Load environment variables from backend/.env
const envPath = path.resolve(__dirname, 'backend', '.env');
if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
} else {
    console.error("❌ backend/.env file not found. Make sure you run this from the project root.");
    process.exit(1);
}

const { query } = require('./backend/config/db');
const EXTERNAL_BASE_URL = 'https://wa.notifynow.in';

async function main() {
    const args = process.argv.slice(2);
    const campaignId = args[0];
    const imageUrl = args[1] || null;

    if (!campaignId) {
        console.log("❌ Usage: node resume_campaign.js <campaignId> [imageUrl]");
        console.log("Example: node resume_campaign.js 731036664 https://cjp.cell24x7.com/dsafsd%20(1).jpg");
        process.exit(1);
    }

    try {
        console.log(`🔍 Fetching details for campaign ${campaignId} from DB...`);
        
        // 1. Get campaign logs to resolve user_id and message content
        const [logs] = await query(
            'SELECT user_id, message_content, template_name FROM api_message_logs WHERE campaign_id = ? LIMIT 1',
            [campaignId]
        );

        if (logs.length === 0) {
            console.error(`❌ Campaign ${campaignId} not found in api_message_logs.`);
            console.log("Note: Make sure this campaign was dispatched and has logs in the database.");
            process.exit(1);
        }

        const { user_id, message_content, template_name } = logs[0];
        console.log(`✅ Campaign details found:`);
        console.log(`   • User ID: ${user_id}`);
        console.log(`   • Message Content: "${message_content}"`);
        console.log(`   • Template: ${template_name}`);

        // 2. Get connected WhatsApp channel for this user
        console.log(`🔍 Fetching connected WhatsApp channels for User ${user_id}...`);
        const [channels] = await query(
            'SELECT id, name, phone_number, status FROM whatsapp_proero_channels WHERE user_id = ? AND status = "connected" ORDER BY id DESC',
            [user_id]
        );

        if (channels.length === 0) {
            console.error(`❌ No connected WhatsApp channels found for User ${user_id}.`);
            console.log("👉 Please make sure your WhatsApp channel is connected on the dashboard first.");
            process.exit(1);
        }

        const channel = channels[0];
        const sessionName = `session${channel.id}`;
        console.log(`✅ Using connected channel: ${channel.name} (${channel.phone_number}) -> Session: ${sessionName}`);

        // 3. Check live session status on Baileys server
        console.log(`🔍 Checking live session status on Baileys server...`);
        let isConnected = false;
        try {
            const sessionsResponse = await axios.get(`${EXTERNAL_BASE_URL}/api/whatsapp/sessions`, { timeout: 4000 });
            const sessions = sessionsResponse.data.sessions || sessionsResponse.data.data?.sessions || sessionsResponse.data || [];
            
            let foundSession = null;
            if (Array.isArray(sessions)) {
                foundSession = sessions.find(s => s.sessionName === sessionName || s.name === sessionName || s.id === sessionName);
            } else if (typeof sessions === 'object' && sessions !== null) {
                foundSession = sessions[sessionName];
            }

            if (foundSession) {
                isConnected = foundSession.status === 'connected' || foundSession.state === 'CONNECTED' || foundSession.ready === true;
            }
        } catch (err) {
            console.warn(`⚠️ Could not reach Baileys server to verify session: ${err.message}`);
        }

        if (!isConnected) {
            console.error(`❌ WhatsApp session ${sessionName} is not active/connected on Baileys server.`);
            console.log("👉 Please go to the dashboard, disconnect and reconnect the channel, scan the QR code, and verify it is connected.");
            process.exit(1);
        }
        console.log(`✅ Baileys session is active and connected.`);

        // 4. Construct payload and fire start endpoint on Baileys
        const baseApiUrl = process.env.API_BASE_URL || 'https://developer.notifynow.in';
        const payload = {
            sessionName: sessionName,
            messageTemplate: message_content,
            webhookUrl: `${baseApiUrl}/api/webhooks/wa-unofficial/callback`
        };

        if (imageUrl) {
            payload.imageUrl = imageUrl;
            console.log(`   • Attaching Image URL: ${imageUrl}`);
        }

        console.log(`🚀 Sending resume request to Baileys server...`);
        console.log(`Payload:`, JSON.stringify(payload, null, 2));

        const response = await axios.post(`${EXTERNAL_BASE_URL}/api/campaign/start/${campaignId}`, payload);
        
        console.log(`\n🎉 Campaign started successfully!`);
        console.log(`Response from provider:`, JSON.stringify(response.data, null, 2));
        process.exit(0);

    } catch (err) {
        console.error(`\n❌ Error resuming campaign:`, err.response?.data || err.message);
        process.exit(1);
    }
}

main();
