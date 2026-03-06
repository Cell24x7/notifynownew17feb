const axios = require('axios');
require('dotenv').config();

async function testDotgoAuth() {
    const clientId = (process.env.DOTGO_ADMIN_CLIENT_ID || '').trim();
    const clientSecret = (process.env.DOTGO_ADMIN_CLIENT_SECRET || '').trim();
    const authUrl = (process.env.DOTGO_ADMIN_AUTH_URL || '').trim();

    console.log('Testing Dotgo Auth with:');
    console.log('URL:', authUrl);
    console.log('Client ID length:', clientId.length);
    console.log('Client Secret length:', clientSecret.length);

    if (!clientId || !clientSecret || !authUrl) {
        console.error('ERROR: Missing Dotgo Admin credentials in .env');
        return;
    }

    try {
        const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
        const response = await axios.post(
            authUrl,
            "grant_type=client_credentials",
            {
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        if (response.data && response.data.access_token) {
            console.log('✅ Dotgo Auth SUCCESS!');
            console.log('Token expires in:', response.data.expires_in, 'seconds');
        } else {
            console.log('❌ Dotgo Auth FAILED: No access token in response');
            console.log('Response:', response.data);
        }
    } catch (error) {
        console.error('❌ Dotgo Auth ERROR:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data));
        } else {
            console.error('Message:', error.message);
        }
    }
}

testDotgoAuth();
