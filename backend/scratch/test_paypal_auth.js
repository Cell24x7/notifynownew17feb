const axios = require('axios');

const clientId = 'AWcUnaGLWGKNxuSteD3AhPcjHN7_tfliRfSH-fh0xLL4yRKMLSkJ5qs65xNtSltSY3NYFSdpPhERS_yW';
const secretKey = 'EAJrZxJ2_3_a2jTBLt16PowYsQo9aFTLDLjdiws615RjnzH0prt1pcT3NOCjP-9wSeLFOMRj4G0HxZVO';

async function testAuth(url, modeName) {
    try {
        console.log(`Testing ${modeName} endpoint: ${url}`);
        const authString = Buffer.from(`${clientId}:${secretKey}`).toString('base64');
        const res = await axios.post(
            `${url}/v1/oauth2/token`,
            'grant_type=client_credentials',
            {
                headers: {
                    'Authorization': `Basic ${authString}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );
        console.log(`✅ Success in ${modeName}! Access token retrieved.`);
        return true;
    } catch (e) {
        console.log(`❌ Failed in ${modeName}:`, e.response ? e.response.data : e.message);
        return false;
    }
}

async function run() {
    const sandboxWorked = await testAuth('https://api-m.sandbox.paypal.com', 'SANDBOX');
    console.log('-------------------------------');
    const liveWorked = await testAuth('https://api-m.paypal.com', 'LIVE');
}

run();
