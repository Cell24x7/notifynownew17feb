const axios = require('axios');

const BASE_URL = 'https://wa.notifynow.in';
const sessionName = 'session1'; // Try session1 or other standard IDs

async function probe() {
    console.log("=== PROBING BAILEYS SESSION CONTACTS ===");

    const paths = [
        `/api/whatsapp/session/${sessionName}/contacts`,
        `/api/whatsapp/session/${sessionName}/chats`,
        `/api/whatsapp/${sessionName}/contacts`,
        `/api/whatsapp/${sessionName}/chats`,
        `/api/contacts/${sessionName}`,
        `/api/chats/${sessionName}`,
        `/api/whatsapp/contacts?sessionName=${sessionName}`,
        `/api/whatsapp/chats?sessionName=${sessionName}`,
        `/api/whatsapp/session/${sessionName}`,
        `/api/session/${sessionName}/contacts`,
        `/api/${sessionName}/contacts`,
        `/api/${sessionName}/chats`,
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
}

probe();
