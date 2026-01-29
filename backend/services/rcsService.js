const axios = require('axios');
require('dotenv').config();

const RCS_API_URL = process.env.RCS_API_URL || 'http://36.255.3.23:7111/rcsApi';
const RCS_USERNAME = process.env.RCS_USERNAME || 'testdemo';
const RCS_PASSWORD = process.env.RCS_PASSWORD || 'Pass@cell24x7';

let rcsAccessToken = null;
let tokenExpiresAt = null;

/**
 * Get RCS Access Token
 * @returns {Promise<string>} - Access token
 */
const getRcsToken = async () => {
    try {
        // Check if token exists and is still valid
        if (rcsAccessToken && tokenExpiresAt && Date.now() < tokenExpiresAt) {
            console.log('✅ Using cached RCS token');
            return rcsAccessToken;
        }

        console.log('🔐 Fetching RCS token from API...');
        console.log(`📍 API URL: ${RCS_API_URL}/getToken`);
        console.log(`👤 Username: ${RCS_USERNAME}`);

        const response = await axios.post(
            `${RCS_API_URL}/getToken`,
            {
                username: RCS_USERNAME,
                password: RCS_PASSWORD
            },
            {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 15000
            }
        );

        console.log('📦 RCS API Response:', JSON.stringify(response.data, null, 2));

        // Try different response formats
        const token =
            response.data?.jwttoken ||           // <- NEW: RCS API uses "jwttoken"
            response.data?.accessToken ||
            response.data?.token ||
            response.data?.access_token ||
            response.data?.data?.accessToken ||
            response.data?.data?.token;

        if (token) {
            rcsAccessToken = token;
            // Token typically expires in 24 hours, set to 23 hours to be safe
            tokenExpiresAt = Date.now() + (23 * 60 * 60 * 1000);
            console.log('✅ RCS Token obtained successfully');
            console.log(`🔑 Token (first 50 chars): ${token.substring(0, 50)}...`);
            return rcsAccessToken;
        } else {
            console.error('❌ RCS Token Error: No token in response');
            console.error('📦 Full response:', JSON.stringify(response.data));
            return null;
        }
    } catch (error) {
        console.error('❌ RCS Token Error:', error.message);
        if (error.response) {
            console.error('📦 Error Response:', JSON.stringify(error.response.data));
            console.error('🔍 Status Code:', error.response.status);
        } else if (error.request) {
            console.error('❌ No response from RCS API - Check if API is running');
            console.error('🌐 Requested URL:', error.request.url);
        }
        return null;
    }
};

/**
 * Send RCS Template Message
 * @param {string} mobile - Mobile number (e.g., 919876839965)
 * @param {string} templateName - Template name (e.g., 'Indian_terrain')
 * @returns {Promise<boolean>}
 */
const sendRcsTemplate = async (mobile, templateName) => {
    try {
        if (!mobile || !templateName) {
            console.error('❌ RCS Error: Mobile and template name required');
            return false;
        }

        // Get token
        const token = await getRcsToken();
        if (!token) {
            console.error('❌ RCS Error: Unable to get access token');
            return false;
        }

        console.log(`📱 Sending RCS template "${templateName}" to ${mobile}...`);

        const response = await axios.post(
            `${RCS_API_URL}/v1/sendTemplate`,
            {
                mobile: mobile,
                templateName: templateName
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                timeout: 10000
            }
        );

        if (response.status === 200 || response.data?.success) {
            console.log(`✅ RCS template sent successfully to ${mobile}`);
            return true;
        } else {
            console.error(`❌ RCS Error: ${response.data?.message || 'Unknown error'}`);
            return false;
        }
    } catch (error) {
        console.error('❌ RCS Service Error:', error.message);
        return false;
    }
};

/**
 * Send RCS Custom Message
 * @param {string} mobile - Mobile number
 * @param {string} message - Custom message text
 * @returns {Promise<boolean>}
 */
const sendRcsMessage = async (mobile, message) => {
    try {
        if (!mobile || !message) {
            console.error('❌ RCS Error: Mobile and message required');
            return false;
        }

        // Get token
        const token = await getRcsToken();
        if (!token) {
            console.error('❌ RCS Error: Unable to get access token');
            return false;
        }

        console.log(`📱 Sending RCS message to ${mobile}...`);

        const response = await axios.post(
            `${RCS_API_URL}/v1/sendMessage`,
            {
                mobile: mobile,
                message: message
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                timeout: 10000
            }
        );

        if (response.status === 200 || response.data?.success) {
            console.log(`✅ RCS message sent successfully to ${mobile}`);
            return true;
        } else {
            console.error(`❌ RCS Error: ${response.data?.message || 'Unknown error'}`);
            return false;
        }
    } catch (error) {
        console.error('❌ RCS Service Error:', error.message);
        return false;
    }
};

module.exports = {
    getRcsToken,
    sendRcsTemplate,
    sendRcsMessage
};
