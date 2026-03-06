const mysql = require('mysql2/promise');
require('dotenv').config();
const axios = require('axios');

async function simulate() {
    console.log('🚀 Starting Webhook Simulation (Fixed)...');

    // 1. Connect to DB using env vars from .env in current dir
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME
        });

        console.log('✅ Connected to Database');

        // 2. Find the latest message
        const [rows] = await connection.execute(
            'SELECT message_id, recipient, campaign_id FROM message_logs ORDER BY created_at DESC LIMIT 1'
        );

        if (rows.length === 0) {
            console.log('❌ No messages found in message_logs. Please send a campaign first.');
            await connection.end();
            return;
        }

        const { message_id, recipient } = rows[0];
        console.log(`📝 Found latest message: ${message_id} for recipient: ${recipient}`);

        // 3. Prepare Simulated Dotgo Webhook Payload
        const statusToTest = process.argv[2] === 'failed' ? 'FAILED' : 'DELIVERED';
        const reason = statusToTest === 'FAILED' ? 'User not on RCS' : null;

        const payload = {
            message: {
                data: Buffer.from(JSON.stringify({
                    messageId: message_id,
                    userPhoneNumber: recipient,
                    eventType: statusToTest,
                    description: reason // Using description to test our new backend logic
                })).toString('base64'),
                attributes: {
                    event_type: statusToTest.toLowerCase()
                },
                messageId: "envelope_" + Date.now(),
                publishTime: new Date().toISOString()
            },
            receivedTime: new Date().toISOString()
        };

        // 4. Send to our endpoint (running on localhost:5000)
        console.log(`📡 Sending simulated ${statusToTest} webhook to /api/webhooks/dotgo...`);
        const response = await axios.post('http://localhost:5000/api/webhooks/dotgo', payload);

        if (response.data.success || response.status === 200) {
            console.log(`✅ Webhook simulation for ${statusToTest} successful!`);
            if (reason) console.log(`📝 Reason: ${reason}`);
            console.log('👉 Check your MIS Log Analytics page now. It will update in <30 seconds.');
        } else {
            console.log('❌ Webhook failed:', response.data);
        }

        await connection.end();
    } catch (error) {
        console.error('❌ Error during simulation:', error.message);
        if (error.code === 'ECONNREFUSED') {
            console.log('💡 Tip: Make sure your backend server is running on http://localhost:5000');
        }
    }
}

simulate();
