const axios = require('axios');
require('dotenv').config();

async function testAdminToken() {
    const clientId = process.env.DOTGO_ADMIN_CLIENT_ID?.trim();
    const clientSecret = process.env.DOTGO_ADMIN_CLIENT_SECRET?.trim();
    const authUrl = process.env.DOTGO_ADMIN_AUTH_URL?.trim();

    console.log('Testing with:');
    console.log('Client ID:', clientId);
    console.log('Auth URL:', authUrl);

    if (!clientId || !clientSecret || !authUrl) {
        console.error('Missing credentials in .env');
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
        console.log('✅ Admin Token Success!');
        console.log('Token starts with:', response.data.access_token?.substring(0, 10));
    } catch (error) {
        console.error('❌ Admin Token Failed:', error.message);
        if (error.response) {
            console.error('Response:', JSON.stringify(error.response.data));
        }
    }
}

testAdminToken();
