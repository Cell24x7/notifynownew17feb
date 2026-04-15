const axios = require('axios');

const testWebhook = async () => {
  const url = 'http://localhost:5000/api/webhooks/rcs/callback';
  
  // Replace this with a real message ID from your message_logs table
  const messageId = 'ENTER_YOUR_RCS_MESSAGE_ID_HERE'; 

  const payload = {
    status: 'failed',
    messageId: messageId,
    error: 'Handset not RCS enabled (Simulated Failure)',
    timestamp: new Date().toISOString()
  };

  try {
    console.log(`🚀 Sending simulated failure for message ${messageId}...`);
    const response = await axios.post(url, payload);
    console.log('✅ Webhook accepted:', response.data);
    console.log('\nCheck your logs to see if the Failover SMS was triggered.');
  } catch (error) {
    console.error('❌ Error:', error.response ? error.response.data : error.message);
  }
};

testWebhook();
