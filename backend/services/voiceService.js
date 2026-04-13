const axios = require('axios');
const FormData = require('form-data');
require('dotenv').config();

/**
 * Get Authentication Token for Voice Audio Upload
 * @param {object} config - { api_user, api_password }
 */
const getVoiceAuthToken = async (config) => {
    try {
        const url = 'http://43.242.212.34:2121/file/authenticate';
        const payload = {
            username: config.api_user || "idpupil2024",
            password: config.api_password || "apipupil2024"
        };
        
        console.log(`🎙️ Attempting Voice Auth for user: ${payload.username} at ${url}`);
        
        const response = await axios.post(url, payload);
        const token = response.data?.jwttoken || response.data?.token || response.data?.accessToken || null;
        
        if (token) {
            console.log(`✅ Voice Auth Success for: ${payload.username}`);
        } else {
            console.warn(`⚠️ No token found in Voice Auth response for: ${payload.username}`);
            console.log('Response body:', JSON.stringify(response.data));
        }
        
        return token;
    } catch (error) {
        console.error('❌ Voice Auth Error:', error.message);
        if (error.response) {
            console.error('Error Response Data:', JSON.stringify(error.response.data));
            console.error('Error Status:', error.response.status);
        }
        return null;
    }
};

/**
 * Upload Audio File to Voice Server
 * @param {Buffer} fileBuffer 
 * @param {string} fileName 
 * @param {object} config 
 */
const uploadVoiceAudio = async (fileBuffer, fileName, config) => {
    try {
        const token = await getVoiceAuthToken(config);
        if (!token) throw new Error("Voice authentication failed");

        const url = 'http://43.242.212.34:2121/file/uploadaudio';
        const form = new FormData();
        form.append('file', fileBuffer, { filename: fileName });

        const response = await axios.post(url, form, {
            headers: {
                ...form.getHeaders(),
                'Authorization': `Bearer ${token}`
            }
        });

        // The API returns the audio ID in the response
        return { 
            success: true, 
            audioId: response.data?.audioId || response.data?.id || response.data?.fileId,
            raw: response.data 
        };
    } catch (error) {
        console.error('❌ Voice Upload Error:', error.message);
        return { success: false, error: error.message };
    }
};

/**
 * Send Static Voice Call
 * @param {string} mobile 
 * @param {string} audioId 
 * @param {object} options - { retries, interval }
 * @param {object} config - { api_user, api_password }
 */
const sendVoiceCall = async (mobile, audioId, options = {}, config = {}) => {
    try {
        const user = config.api_user || "idpupil2024";
        const pwd = config.api_password || "apipupil2024";
        const cleanMobile = mobile.replace(/\D/g, '').slice(-10); // Ensure 10 digits
        
        const retries = options.retries || 2;
        const interval = options.interval || 5;

        // API URL provided by user
        const url = `https://voice.cell24x7.com/voiceReceiver/api?user=${user}&pwd=${pwd}&mobile=${cleanMobile}&audio=${audioId}&retries=${retries}&retryinterval=${interval}`;

        const response = await axios.get(url);
        
        // Example response: "Success: 12345" or JSON
        const isSuccess = String(response.data).toLowerCase().includes('success') || response.status === 200;

        return { 
            success: isSuccess, 
            messageId: response.data?.id || `voice_${Date.now()}`,
            raw: response.data 
        };
    } catch (error) {
        console.error('❌ Voice Send Error:', error.message);
        return { success: false, error: error.message };
    }
};

module.exports = {
    getVoiceAuthToken,
    uploadVoiceAudio,
    sendVoiceCall
};
