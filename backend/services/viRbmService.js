const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
require('dotenv').config();

const VI_RBM_AUTH_URL = process.env.VI_RBM_AUTH_URL
const VI_RBM_API_URL = process.env.VI_RBM_API_URL
const VI_RBM_CLIENT_ID = process.env.VI_RBM_CLIENT_ID;
const VI_RBM_CLIENT_SECRET = process.env.VI_RBM_CLIENT_SECRET;
const VI_RBM_BOT_ID = process.env.VI_RBM_BOT_ID;

let rbmAccessToken = null;
let tokenExpiresAt = null;

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

        const form = new FormData();
        // The API expects 'rich_template_data' as a JSON string or object. 
        // Based on docs, it's a multipart request where one part is the JSON data and others are files.

        // Append JSON data
        form.append('rich_template_data', JSON.stringify(templateData));

        // Append Files
        if (mediaFiles && mediaFiles.length > 0) {
            for (const file of mediaFiles) {
                if (fs.existsSync(file.path)) {
                    form.append('multimedia_files', fs.createReadStream(file.path), {
                        filename: file.filename
                    });
                }
            }
        }

        const response = await axios.post(
            `${VI_RBM_API_URL}/directory/secure/api/v1/bots/${VI_RBM_BOT_ID}/templates`,
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
            `${VI_RBM_API_URL}/directory/secure/api/v1/bots/${VI_RBM_BOT_ID}/templates/${encodedName}`,
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

        const encodedName = Buffer.from(templateName).toString('base64url');

        await axios.delete(
            `${VI_RBM_API_URL}/directory/secure/api/v1/bots/${VI_RBM_BOT_ID}/templates/${encodedName}`,
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
            console.error('📦 Error Response:', JSON.stringify(error.response.data));
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

        const response = await axios.get(
            `${VI_RBM_API_URL}/directory/secure/api/v1/bots/${VI_RBM_BOT_ID}/templates`,
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
 * Upload File to Vi RBM
 * @param {string} filePath 
 * @param {string} mimeType 
 * @returns {Promise<string>} - fileId or fileUrl
 */
const uploadFile = async (filePath, mimeType) => {
    try {
        const token = await getRbmToken();
        if (!token) throw new Error('Failed to get access token');

        const form = new FormData();
        form.append('fileContent', fs.createReadStream(filePath));
        form.append('fileType', mimeType);
        // expiry could be optional, maybe 'until' field

        const response = await axios.post(
            // GSMA style file upload or Google style?
            // Document mentions: {serverRoot}/bot/v1/{botId}/files
            // AND {serverRoot}/rcs/upload/v1/files?botId={botId} (Section 3.6)
            // Let's use 3.6 as it seems more generic for the platform
            `${VI_RBM_API_URL}/rcs/upload/v1/files?botId=${VI_RBM_BOT_ID}`,
            form,
            {
                headers: {
                    ...form.getHeaders(),
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        // Response example 1: { "name": "9mEFZnVTBsycGwtVTH7BovQwuz0Msr9p" }
        return response.data?.name || response.data?.fileId;
    } catch (error) {
        console.error('❌ Upload File Error:', error.message);
        throw error;
    }
};

module.exports = {
    getRbmToken,
    submitTemplate,
    updateTemplate,
    deleteTemplate,
    getTemplateList,
    uploadFile
};
