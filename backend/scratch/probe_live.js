const axios = require('axios');

(async () => {
  const urls = [
    'https://developer.notifynow.in/api/webhooks/wa-unofficial/callback',
    'https://notifynow.in/api/webhooks/wa-unofficial/callback'
  ];

  console.log("=== PROBING WEBHOOK URLS ===");
  for (const url of urls) {
    try {
      console.log(`[PROBE] GET ${url}...`);
      const res = await axios.get(url, { timeout: 8000 });
      console.log(`[SUCCESS] GET ${url}:`, res.status, res.data);
    } catch (err) {
      console.log(`[FAILED] GET ${url}:`, err.response?.status || err.message);
      if (err.response?.data) {
        console.log("Error response:", JSON.stringify(err.response.data));
      }
    }
    console.log("------------------------------------------");
  }

  // Let's also try a POST to see if they accept a mock request
  for (const url of urls) {
    try {
      console.log(`[PROBE] POST ${url}...`);
      const res = await axios.post(url, {
        campaign_id: "436011473",
        recipient: "919718355523",
        message_id: "3EB014766F1A738019B035",
        status: "delivered"
      }, { timeout: 8000 });
      console.log(`[SUCCESS] POST ${url}:`, res.status, res.data);
    } catch (err) {
      console.log(`[FAILED] POST ${url}:`, err.response?.status || err.message);
      if (err.response?.data) {
        console.log("Error response:", JSON.stringify(err.response.data));
      }
    }
    console.log("------------------------------------------");
  }
})();
