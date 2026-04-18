const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { query } = require('../config/db');

/**
 * Downloads WhatsApp media from Meta/Pinbot and saves it locally.
 * @param {string} mediaId - The media ID from WhatsApp payload
 * @param {number} userId - The user ID to get WhatsApp config
 * @returns {Promise<string|null>} - The local URL of the downloaded file
 */
async function downloadWAMedia(mediaId, userId) {
    try {
        if (!mediaId || !userId) return null;

        // 1. Get WhatsApp Config
        const [users] = await query('SELECT whatsapp_config_id FROM users WHERE id = ?', [userId]);
        if (!users.length || !users[0].whatsapp_config_id) return null;

        const [configs] = await query('SELECT * FROM whatsapp_configs WHERE id = ?', [users[0].whatsapp_config_id]);
        if (!configs.length) return null;

        const config = configs[0];
        const isPinbot = config.provider === 'vendor2';
        
        const PINBOT_BASE = 'https://partnersv1.pinbot.ai/v3';
        const GRAPH_BASE = 'https://graph.facebook.com/v19.0';
        
        let mediaUrl = '';
        let headers = {};

        if (isPinbot) {
            // Pinbot media URL retrieval
            const resp = await axios.get(`${PINBOT_BASE}/${mediaId}`, {
                headers: { apikey: config.api_key },
                params: { phone_number_id: config.ph_no_id }
            });
            mediaUrl = resp.data.url || resp.data.link;
            headers = { apikey: config.api_key };
        } else {
            // Meta Graph API media URL retrieval
            const resp = await axios.get(`${GRAPH_BASE}/${mediaId}`, {
                headers: { Authorization: `Bearer ${config.wa_token}` }
            });
            mediaUrl = resp.data.url;
            headers = { Authorization: `Bearer ${config.wa_token}` };
        }

        if (!mediaUrl) return null;

        // 2. Download the file
        const response = await axios.get(mediaUrl, { 
            headers, 
            responseType: 'arraybuffer' 
        });

        // 3. Save locally
        const filename = `wa_recv_${Date.now()}_${mediaId.substring(0, 8)}.bin`; // Temporary extension
        const dir = path.join(__dirname, '..', 'uploads', 'whatsapp_media');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        // Try to guess extension from content-type or mediaUrl
        let ext = '.jpg';
        const contentType = response.headers['content-type'];
        if (contentType) {
            if (contentType.includes('png')) ext = '.png';
            else if (contentType.includes('video/mp4')) ext = '.mp4';
            else if (contentType.includes('pdf')) ext = '.pdf';
            else if (contentType.includes('jpeg')) ext = '.jpg';
        }

        const finalFilename = filename.replace('.bin', ext);
        const filePath = path.join(dir, finalFilename);
        fs.writeFileSync(filePath, response.data);

        // 4. Return local URL
        // Using relative path for the proxy route
        return `/api/whatsapp/media-file/${finalFilename}`;
    } catch (error) {
        console.error('❌ Error downloading WA media:', error.message);
        return null;
    }
}

module.exports = { downloadWAMedia };
