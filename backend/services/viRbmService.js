const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
require('dotenv').config();
const { query } = require('../config/db');

const VI_RBM_AUTH_URL = process.env.VI_RBM_AUTH_URL;
const VI_RBM_API_URL = process.env.VI_RBM_API_URL;
const VI_RBM_CLIENT_ID = process.env.VI_RBM_CLIENT_ID;
const VI_RBM_CLIENT_SECRET = process.env.VI_RBM_CLIENT_SECRET;
let VI_RBM_BOT_ID = process.env.VI_RBM_BOT_ID;

let rbmAccessToken = null;
let tokenExpiresAt = null;

// Helper to get Bot ID if not in env
const getBotId = async () => {
    if (VI_RBM_BOT_ID) return VI_RBM_BOT_ID;
    try {
        const [bots] = await query('SELECT id FROM rcs_bots WHERE status = "ACTIVE" OR status = "APPROVED" LIMIT 1');
        if (bots.length > 0) {
            VI_RBM_BOT_ID = bots[0].id;
            return VI_RBM_BOT_ID;
        }
        // Fallback to any bot if no active one found
        const [anyBot] = await query('SELECT id FROM rcs_bots LIMIT 1');
        if (anyBot.length > 0) {
            VI_RBM_BOT_ID = anyBot[0].id;
            return VI_RBM_BOT_ID;
        }
    } catch (err) {
        console.error('Error fetching Bot ID from DB:', err.message);
    }
    return null;
};

/**
 * Get Vi RBM Access Token
 * Uses client_credentials flow
 * @returns {Promise<string>} - Access token
 */
const getRbmToken = async () => {
    try {
        if (rbmAccessToken && tokenExpiresAt && Date.now() < tokenExpiresAt) {
            return rbmAccessToken;
        }

        const auth = Buffer.from(`${VI_RBM_CLIENT_ID}:${VI_RBM_CLIENT_SECRET}`).toString('base64');

        const response = await axios.post(
            `${VI_RBM_AUTH_URL}?grant_type=client_credentials`,
            {},
            {
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (response.data && response.data.access_token) {
            rbmAccessToken = response.data.access_token;
            // Set expiry (usually 1 hour, but check response or default to 55 mins)
            const expiresIn = response.data.expires_in || 3600;
            tokenExpiresAt = Date.now() + (expiresIn * 1000) - 300000; // 5 mins buffer
            console.log('✅ Vi RBM Token obtained successfully');
            return rbmAccessToken;
        } else {
            console.error('❌ Vi RBM Token Error: No access_token in response');
            return null;
        }
    } catch (error) {
        console.error('❌ Vi RBM Token Error:', error.message);
        if (error.response) {
            console.error('📦 Error Response:', JSON.stringify(error.response.data));
        }
        return null;
    }
};

/**
 * Submit Template to Vi RBM
 * @param {Object} templateData - Template data matching Vi RBM specs
 * @param {Array} mediaFiles - Array of file objects { path, filename, fieldname }
 * @returns {Promise<Object>}
 */
const submitTemplate = async (templateData, mediaFiles = []) => {
    try {
        const token = await getRbmToken();
        if (!token) throw new Error('Failed to get access token');

        const botId = await getBotId();
        if (!botId) throw new Error('No RCS Bot Configured. Please create a bot first.');

        const form = new FormData();

        // Append JSON data
        form.append('rich_template_data', JSON.stringify(templateData));

        // Append Files if provided
        if (mediaFiles && mediaFiles.length > 0) {
            for (const file of mediaFiles) {
                if (fs.existsSync(file.path)) {
                    form.append('multimedia_files', fs.createReadStream(file.path), {
                        filename: file.filename
                    });
                }
            }
        }

        console.log(`📤 Posting to ${VI_RBM_API_URL}/directory/secure/api/v1/bots/${botId}/templates`);

        const response = await axios.post(
            `${VI_RBM_API_URL}/directory/secure/api/v1/bots/${botId}/templates`,
            form,
            {
                headers: {
                    ...form.getHeaders(),
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        return response.data;
    } catch (error) {
        console.error('❌ Submit Template Error:', error.message);
        if (error.response) {
            console.error('📦 Error Response:', JSON.stringify(error.response.data));
            throw error.response.data; // Re-throw to be handled by controller
        }
        throw error;
    }
};

/**
 * Update Template in Vi RBM
 * @param {string} templateName - Name of the template to update
 * @param {Object} templateData - Updated template data
 * @param {Array} mediaFiles - Array of files
 * @returns {Promise<Object>}
 */
const updateTemplate = async (templateName, templateData, mediaFiles = []) => {
    try {
        const token = await getRbmToken();
        if (!token) throw new Error('Failed to get access token');

        const botId = await getBotId();
        if (!botId) throw new Error('No RCS Bot Configured.');

        // Template name needs to be Base64 URL Encoded for the path
        const encodedName = Buffer.from(templateName).toString('base64url');

        const form = new FormData();
        form.append('rich_template_data', JSON.stringify(templateData));

        if (mediaFiles && mediaFiles.length > 0) {
            for (const file of mediaFiles) {
                if (fs.existsSync(file.path)) {
                    form.append('multimedia_files', fs.createReadStream(file.path), {
                        filename: file.filename
                    });
                }
            }
        }

        const response = await axios.put(
            `${VI_RBM_API_URL}/directory/secure/api/v1/bots/${botId}/templates/${encodedName}`,
            form,
            {
                headers: {
                    ...form.getHeaders(),
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        return response.data;
    } catch (error) {
        console.error('❌ Update Template Error:', error.message);
        if (error.response) {
            console.error('📦 Error Response:', JSON.stringify(error.response.data));
            throw error.response.data;
        }
        throw error;
    }
};

/**
 * Delete Template from Vi RBM
 * @param {string} templateName 
 * @returns {Promise<boolean>}
 */
const deleteTemplate = async (templateName) => {
    try {
        const token = await getRbmToken();
        if (!token) throw new Error('Failed to get access token');

        const botId = await getBotId();
        if (!botId) throw new Error('No RCS Bot Configured.');

        const encodedName = Buffer.from(templateName).toString('base64url');

        await axios.delete(
            `${VI_RBM_API_URL}/directory/secure/api/v1/bots/${botId}/templates/${encodedName}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        return true;
    } catch (error) {
        console.error('❌ Delete Template Error:', error.message);
        if (error.response) {
            // If 404, consider it already deleted
            if (error.response.status === 404) return true;
        }
        throw error;
    }
};

/**
 * Get Template List
 * @returns {Promise<Array>}
 */
const getTemplateList = async () => {
    try {
        const token = await getRbmToken();
        if (!token) throw new Error('Failed to get access token');

        const botId = await getBotId();
        if (!botId) return [];

        const response = await axios.get(
            `${VI_RBM_API_URL}/directory/secure/api/v1/bots/${botId}/templates`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        return response.data;
    } catch (error) {
        console.error('❌ Get Template List Error:', error.message);
        return [];
    }
};

/**
 * Get Template Status
 * @param {string} templateName 
 * @returns {Promise<string>}
 */
const getTemplateStatus = async (templateName) => {
    try {
        const token = await getRbmToken();
        if (!token) throw new Error('Failed to get access token');

        const botId = await getBotId();
        if (!botId) return 'unknown';

        const encodedName = Buffer.from(templateName).toString('base64url');

        const response = await axios.get(
            `${VI_RBM_API_URL}/directory/secure/api/v1/bots/${botId}/templates/${encodedName}/templateStatus`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        return response.data?.templateStatus || 'unknown';
    } catch (error) {
        console.error('❌ Get Template Status Error:', error.message);
        return 'unknown';
    }
};

/**
 * Upload Media from URL (Vi RBM feature)
 * @param {string} fileUrl - Public URL of the file
 * @returns {Promise<string>} - Media URL or ID
 */
const uploadMediaFromUrl = async (fileUrl) => {
    return fileUrl;
};

/**
 * Upload File to Vi RBM
 * @param {Object} file 
 * @returns {Promise<string>}
 */
const uploadFile = async (file) => {
    // Placeholder
    return null;
};

/**
 * Create/Register Bot with Vi RBM
 * @param {Object} botData - Data from local DB
 * @returns {Promise<Object>} - Response containing botId
 */
const createRbmBot = async (botData) => {
    try {
        const token = await getRbmToken();
        if (!token) throw new Error('Failed to get access token');

        console.log('📤 Creating/Approving Bot on Vi RBM...');

        // This targets the user's specific approval endpoint request
        const response = await axios.post(
            `${VI_RBM_AUTH_URL.replace('auth/oauth/token', 'api/bots/approve')}`,
            {
                botId: botData.id,
                name: botData.bot_name
            },
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        return response.data;
    } catch (error) {
        console.error('❌ Create RBM Bot Error:', error.message);
        if (error.response) {
            console.error('📦 Error Response:', JSON.stringify(error.response.data));
            throw error.response.data;
        }
        throw error;
    }
};

/**
 * Get Bot Status from Vi RBM
 * @param {string} botId 
 * @returns {Promise<string>}
 */
const getBotStatus = async (botId) => {
    try {
        const token = await getRbmToken();
        if (!token) throw new Error('Failed to get access token');

        const response = await axios.get(
            `${VI_RBM_API_URL}/directory/secure/api/v1/bots/${botId}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        return response.data?.launchState || 'UNKNOWN';
    } catch (error) {
        console.error('❌ Get Bot Status Error:', error.message);
        return 'UNKNOWN';
    }
};

module.exports = {
    getRbmToken,
    submitTemplate,
    updateTemplate,
    deleteTemplate,
    getTemplateList,
    getTemplateStatus,
    uploadFile,
    createRbmBot,
    getBotStatus
};
