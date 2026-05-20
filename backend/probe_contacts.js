const axios = require('axios');

const BASE_URL = 'https://wa.notifynow.in';
const testCampaignId = '855053';
const userId = 55;

async function probe() {
    console.log("=== PROBING CONTACT OPERATIONS ===");

    // 1. Test POST /api/campaign/delete-contacts with parameters
    try {
        console.log("[PROBE] POST /api/campaign/delete-contacts with body...");
        const res = await axios.post(`${BASE_URL}/api/campaign/delete-contacts`, {
            campaign_id: testCampaignId,
            user_id: userId,
            contacts: ['919876543210']
        });
        console.log("[SUCCESS] delete-contacts:", res.status, res.data);
    } catch (err) {
        console.log("[FAILED] delete-contacts:", err.response?.status);
        console.log("Error response:", JSON.stringify(err.response?.data));
    }
    console.log("------------------------------------------");

    // 2. Test alternative fields for delete-contacts (e.g. numbers instead of contacts)
    try {
        console.log("[PROBE] POST /api/campaign/delete-contacts with numbers field...");
        const res = await axios.post(`${BASE_URL}/api/campaign/delete-contacts`, {
            campaign_id: testCampaignId,
            user_id: userId,
            numbers: ['919876543210']
        });
        console.log("[SUCCESS] delete-contacts (numbers):", res.status, res.data);
    } catch (err) {
        console.log("[FAILED] delete-contacts (numbers):", err.response?.status);
        console.log("Error response:", JSON.stringify(err.response?.data));
    }
    console.log("------------------------------------------");

    // 3. Probe get/list contacts endpoints with user_id and campaign_id
    const listEndpoints = [
        { method: 'POST', url: '/api/campaign/get-contacts', data: { campaign_id: testCampaignId, user_id: userId } },
        { method: 'POST', url: '/api/campaign/contacts', data: { campaign_id: testCampaignId, user_id: userId } },
        { method: 'POST', url: '/api/campaign/list-contacts', data: { campaign_id: testCampaignId, user_id: userId } },
        { method: 'GET', url: `/api/campaign/contacts?campaign_id=${testCampaignId}&user_id=${userId}` },
        { method: 'GET', url: `/api/campaign/${testCampaignId}/contacts?user_id=${userId}` },
        { method: 'POST', url: `/api/campaign/${testCampaignId}/contacts`, data: { user_id: userId } },
        { method: 'GET', url: `/api/campaign/${testCampaignId}/status?user_id=${userId}` }
    ];

    for (const ep of listEndpoints) {
        try {
            console.log(`[PROBE] ${ep.method} ${ep.url}...`);
            const res = await axios({
                method: ep.method,
                url: `${BASE_URL}${ep.url}`,
                data: ep.data,
                timeout: 3000
            });
            console.log(`[SUCCESS] ${ep.method} ${ep.url}:`, res.status);
            console.log(JSON.stringify(res.data, null, 2).substring(0, 300));
        } catch (err) {
            console.log(`[FAILED] ${ep.method} ${ep.url}:`, err.response?.status || err.message);
            if (err.response?.data) {
                console.log("Error response:", JSON.stringify(err.response.data).substring(0, 200));
            }
        }
        console.log("------------------------------------------");
    }
}

probe();
