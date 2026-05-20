const axios = require('axios');

const BASE_URL = 'https://wa.notifynow.in';
const testNumber = '918169123456'; // Generic contact number
const sessionName = 'notifynow-live-prod'; // Or other default session name

async function probe() {
    console.log("=== PROBING WHATSAPP CONTACT DETAILS ===");
    
    // We try generic paths for session-based contact lookups
    const paths = [
        `/api/whatsapp/contact/${testNumber}`,
        `/api/whatsapp/info/${testNumber}`,
        `/api/whatsapp/profile/${testNumber}`,
        `/api/whatsapp/check/${testNumber}`,
        `/api/whatsapp/status/${testNumber}`,
        `/api/whatsapp/search/${testNumber}`,
        `/api/whatsapp/contact-info/${testNumber}`,
        `/api/whatsapp/contacts`,
        `/api/whatsapp/contacts/${sessionName}`
    ];

    for (const path of paths) {
        try {
            console.log(`[PROBE] GET ${path}...`);
            const res = await axios.get(`${BASE_URL}${path}`, { timeout: 3000 });
            console.log(`[SUCCESS] GET ${path}:`, res.status);
            console.log(JSON.stringify(res.data, null, 2).substring(0, 300));
        } catch (err) {
            console.log(`[FAILED] GET ${path}:`, err.response?.status || err.message);
            if (err.response?.data) {
                console.log("Error response:", JSON.stringify(err.response.data).substring(0, 200));
            }
        }
        console.log("------------------------------------------");
    }

    // Try POST lookups as well
    const postPaths = [
        { url: '/api/whatsapp/contact', data: { number: testNumber } },
        { url: '/api/whatsapp/check-number', data: { number: testNumber } },
        { url: '/api/whatsapp/get-contact', data: { number: testNumber } }
    ];

    for (const ep of postPaths) {
        try {
            console.log(`[PROBE] POST ${ep.url}...`);
            const res = await axios.post(`${BASE_URL}${ep.url}`, ep.data, { timeout: 3000 });
            console.log(`[SUCCESS] POST ${ep.url}:`, res.status);
            console.log(JSON.stringify(res.data, null, 2).substring(0, 300));
        } catch (err) {
            console.log(`[FAILED] POST ${ep.url}:`, err.response?.status || err.message);
            if (err.response?.data) {
                console.log("Error response:", JSON.stringify(err.response.data).substring(0, 200));
            }
        }
        console.log("------------------------------------------");
    }
}

probe();
