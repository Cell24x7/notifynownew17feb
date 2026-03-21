require('dotenv').config({ path: './backend/.env' });
const axios = require('axios');

async function testWebhook() {
  const url = 'http://localhost:5000/api/webhooks/sms/callback';
  const payload = {
    msgid: 'test_sms_123',
    status: '1',  // Delivered
    mobile: '919004207813'
  };

  try {
    console.log('Sending test webhook to:', url);
    const response = await axios.get(url, { params: payload });
    console.log('Response Status:', response.status);
    console.log('Response Body:', response.data);
  } catch (err) {
    console.error('Test Failed:', err.message);
  }
}

testWebhook();
