const axios = require('axios');
const FormData = require('form-data');

/**
 * Cell24x7 / MDsMedia Provider
 */
const getVoiceAuthToken = async (config) => {
    try {
        const url = 'http://43.242.212.34:2121/file/authenticate';
        const payload = {
            username: config.api_user || "Idpupil2024",
            password: config.api_password || "apipupil2024"
        };
        
        console.log(`🎙️ Attempting Cell24x7 Auth for user: ${payload.username}`);
        
        const response = await axios.post(url, payload, { timeout: 10000 });
        const token = response.data?.jwttoken || response.data?.token || response.data?.accessToken || null;
        
        return token;
    } catch (error) {
        console.error('❌ Cell24x7 Voice Auth Error:', error.message);
        return null;
    }
};

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
            },
            timeout: 30000
        });

        return { 
            success: true, 
            audioId: response.data?.data || response.data?.audioId || response.data?.id,
            raw: response.data 
        };
    } catch (error) {
        console.error('❌ Cell24x7 Voice Upload Error:', error.message);
        return { success: false, error: error.message };
    }
};

const sendVoiceCall = async (mobile, audioId, options = {}, config = {}) => {
    try {
        const user = config.api_user || "Idpupil2024";
        const pwd = config.api_password || "apipupil2024";
        const cleanMobile = mobile.replace(/\D/g, '').slice(-10); // Ensure 10 digits
        
        const retries = options.retries || 2;
        const interval = options.interval || 5;

        // Build Callback URL
        const baseSystemUrl = (process.env.API_BASE_URL || 'https://notifynow.in').replace('https://', 'http://');
        const callbackUrl = encodeURIComponent(`${baseSystemUrl}/api/webhooks/voice/callback?campaign_id=${options.campaignId || 'manual'}&user_id=${options.userId || 0}`);

        const url = `https://voice.cell24x7.com/voiceReceiver/api?user=${user}&pwd=${pwd}&mobile=${cleanMobile}&audio=${audioId}&retries=${retries}&retryinterval=${interval}&callback=${callbackUrl}`;
        
        const response = await axios.get(url, { timeout: 15000 });
        const isSuccess = String(response.data).toLowerCase().includes('success') || response.status === 200;

        return { 
            success: isSuccess, 
            messageId: response.data?.id || `voice_${Date.now()}`,
            raw: response.data 
        };
    } catch (error) {
        console.error('❌ Cell24x7 Voice Send Error:', error.message);
        return { success: false, error: error.message };
    }
};

module.exports = {
    uploadVoiceAudio,
    sendVoiceCall
};
