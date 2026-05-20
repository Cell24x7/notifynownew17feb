const axios = require('axios');

const BASE_URL = 'https://wa.notifynow.in';

async function probe() {
    const endpoints = [
        { method: 'POST', url: '/api/campaign/add', data: { id: 9999, name: 'Test Campaign', user_id: 55 } },
        { method: 'POST', url: '/api/campaign/new', data: { id: 9999, name: 'Test Campaign', user_id: 55 } },
        { method: 'POST', url: '/api/campaign/register', data: { id: 9999, name: 'Test Campaign', user_id: 55 } },
        { method: 'POST', url: '/api/campaign/setup', data: { id: 9999, name: 'Test Campaign', user_id: 55 } },
        { method: 'POST', url: '/api/campaigns/create', data: { id: 9999, name: 'Test Campaign', user_id: 55 } },
        { method: 'POST', url: '/api/campaigns/new', data: { id: 9999, name: 'Test Campaign', user_id: 55 } },
        { method: 'POST', url: '/api/campaigns/add', data: { id: 9999, name: 'Test Campaign', user_id: 55 } },
        { method: 'POST', url: '/api/campaigns/save', data: { id: 9999, name: 'Test Campaign', user_id: 55 } },
        { method: 'POST', url: '/api/campaigns/register', data: { id: 9999, name: 'Test Campaign', user_id: 55 } },
        { method: 'POST', url: '/api/campaign/create-campaign', data: { id: 9999, name: 'Test Campaign', user_id: 55 } },
        { method: 'POST', url: '/api/campaign/add-campaign', data: { id: 9999, name: 'Test Campaign', user_id: 55 } }
    ];

    for (const ep of endpoints) {
        try {
            console.log(`[PROBE] Trying ${ep.method} ${ep.url}...`);
            const res = await axios({
                method: ep.method,
                url: `${BASE_URL}${ep.url}`,
                data: ep.data,
                timeout: 5000
            });
            console.log(`[SUCCESS] Status: ${res.status}, Data:`, JSON.stringify(res.data).substring(0, 200));
        } catch (err) {
            console.log(`[FAILED] Status: ${err.response?.status}, Msg:`, JSON.stringify(err.response?.data || err.message).substring(0, 200));
        }
        console.log('--------------------------------------------------');
    }
}

probe();
