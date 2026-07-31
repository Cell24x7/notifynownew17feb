const axios = require('axios');
const FormData = require('form-data');

/**
 * EDPL Voice Gateway Provider
 */
const getAuthHeaders = (config) => {
    const headers = {};
    if (config.api_key) {
        // If API key is provided, assume Bearer token by default or basic API key.
        headers['Authorization'] = `Bearer ${config.api_key}`;
    }
    return headers;
};

const getBaseUrl = (config) => {
    return (config.base_url || 'https://callcenter-edpl.onrender.com').replace(/\/$/, ''); // Remove trailing slash
};

/**
 * Broadcast Campaign via EDPL
 * Supports uploading CSV leads and audio file buffer directly to gateway.
 */
const createBroadcastCampaign = async (name, audioBuffer, audioFileName, csvBuffer, csvFileName, allowedPorts, config) => {
    try {
        const url = `${getBaseUrl(config)}/api/campaigns/broadcast`;
        
        const form = new FormData();
        form.append('name', name);
        
        if (allowedPorts) {
            form.append('allowedPorts', allowedPorts); // e.g., "[0,1]"
        }
        
        // Append Audio
        if (audioBuffer) {
            form.append('broadcastAudio', audioBuffer, { filename: audioFileName });
        }
        
        // Append CSV
        if (csvBuffer) {
            form.append('leadsCsv', csvBuffer, { filename: csvFileName });
        }

        console.log(`🎙️ Creating EDPL Broadcast Campaign: ${name}...`);

        const response = await axios.post(url, form, {
            headers: {
                ...form.getHeaders(),
                ...getAuthHeaders(config)
            },
            timeout: 60000 // 60 seconds as file uploads might take time
        });

        return {
            success: true,
            campaignId: response.data?.campaignId || response.data?.id,
            raw: response.data
        };
    } catch (error) {
        console.error('❌ EDPL Broadcast Error:', error.message);
        return { success: false, error: error.response?.data || error.message };
    }
};

/**
 * Get EDPL Campaign Status
 */
const getCampaignStatus = async (campaignId, config) => {
    try {
        const url = `${getBaseUrl(config)}/api/campaigns/${campaignId}`;
        const response = await axios.get(url, {
            headers: getAuthHeaders(config),
            timeout: 10000
        });

        return {
            success: true,
            data: response.data
        };
    } catch (error) {
        console.error(`❌ EDPL Status Error for ${campaignId}:`, error.message);
        return { success: false, error: error.response?.data || error.message };
    }
};

/**
 * Get EDPL Gateway Ports
 */
const getGatewayPorts = async (config) => {
    try {
        const url = `${getBaseUrl(config)}/api/gateways/ports`;
        const response = await axios.get(url, {
            headers: getAuthHeaders(config),
            timeout: 10000
        });

        return {
            success: true,
            ports: response.data
        };
    } catch (error) {
        console.error('❌ EDPL Ports Error:', error.message);
        return { success: false, error: error.message };
    }
};

module.exports = {
    createBroadcastCampaign,
    getCampaignStatus,
    getGatewayPorts
};
