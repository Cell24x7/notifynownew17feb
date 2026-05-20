const axios = require('axios');

const BASE_URL = 'https://wa.notifynow.in';
const testCampaignId = '855053'; // From user's screenshot campaign number

async function testEndpoints() {
    const paths = [
        `/api/campaign/${testCampaignId}`,
        `/api/campaign/${testCampaignId}/contacts`,
        `/api/campaign/${testCampaignId}/status`,
        `/api/campaign/${testCampaignId}/logs`,
        `/api/campaign/list`,
        `/api/campaign/contacts`,
    ];

    console.log("=== PROBING BAILEYS CAMPAIGN ENDPOINTS ===");
    for (const path of paths) {
        try {
            console.log(`[PROBE] GET ${path}...`);
            const res = await axios.get(`${BASE_URL}${path}`, { timeout: 3000 });
            console.log(`[SUCCESS] GET ${path}:`, res.status);
            console.log(JSON.stringify(res.data, null, 2).substring(0, 500));
        } catch (err) {
            console.log(`[FAILED] GET ${path}:`, err.response?.status || err.message);
            if (err.response?.data) {
                console.log("Error response:", JSON.stringify(err.response.data).substring(0, 200));
            }
        }
        console.log("------------------------------------------");
    }

    // Probe delete contact endpoints
    const deletePayloads = [
        { method: 'DELETE', url: `/api/campaign/${testCampaignId}/contacts`, data: { contacts: ['919876543210'] } },
        { method: 'POST', url: `/api/campaign/${testCampaignId}/delete-contacts`, data: { contacts: ['919876543210'] } },
        { method: 'DELETE', url: `/api/campaign/contacts`, data: { campaign_id: testCampaignId, contacts: ['919876543210'] } },
        { method: 'POST', url: `/api/campaign/delete-contacts`, data: { campaign_id: testCampaignId, contacts: ['919876543210'] } },
        { method: 'DELETE', url: `/api/campaign/${testCampaignId}/contact/919876543210` },
        { method: 'POST', url: `/api/campaign/${testCampaignId}/remove-contact`, data: { contact: '919876543210' } }
    ];

    console.log("\n=== PROBING DELETE ENDPOINTS ===");
    for (const ep of deletePayloads) {
        try {
            console.log(`[PROBE] ${ep.method} ${ep.url}...`);
            const res = await axios({
                method: ep.method,
                url: `${BASE_URL}${ep.url}`,
                data: ep.data,
                timeout: 3000
            });
            console.log(`[SUCCESS] ${ep.method} ${ep.url}:`, res.status);
            console.log(JSON.stringify(res.data, null, 2).substring(0, 200));
        } catch (err) {
            console.log(`[FAILED] ${ep.method} ${ep.url}:`, err.response?.status || err.message);
            if (err.response?.data) {
                console.log("Error response:", JSON.stringify(err.response.data).substring(0, 200));
            }
        }
        console.log("------------------------------------------");
    }
}

testEndpoints();
