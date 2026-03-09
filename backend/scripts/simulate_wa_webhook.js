const axios = require('axios');

const WEBHOOK_URL = 'http://localhost:5000/api/webhooks/whatsapp/callback';

async function simulateIncomingMessage() {
    const payload = {
        "object": "whatsapp_business_account",
        "entry": [
            {
                "id": "1234567890",
                "changes": [
                    {
                        "field": "messages",
                        "value": {
                            "messaging_product": "whatsapp",
                            "metadata": {
                                "display_phone_number": "919876543210",
                                "phone_number_id": "123456123"
                            },
                            "contacts": [
                                {
                                    "profile": { "name": "Sandeep Test User" },
                                    "wa_id": "919876839965"
                                }
                            ],
                            "messages": [
                                {
                                    "from": "919876839965",
                                    "id": `wamid.TEST_INCOMING_${Date.now()}`,
                                    "timestamp": Math.floor(Date.now() / 1000).toString(),
                                    "text": {
                                        "body": "Hello! Yeh ek test WhatsApp message hai!"
                                    },
                                    "type": "text"
                                }
                            ]
                        }
                    }
                ]
            }
        ]
    };

    try {
        console.log("📤 [1] Sending Incoming Message Simulation...");
        const response = await axios.post(WEBHOOK_URL, payload, {
            headers: { 'Content-Type': 'application/json' }
        });
        console.log("✅ Response Status:", response.status);
    } catch (error) {
        console.error("❌ Error:", error.response?.status, error.response?.data || error.message);
    }
}

async function simulateDeliveryReport() {
    const payload = {
        "object": "whatsapp_business_account",
        "entry": [
            {
                "id": "1234567890",
                "changes": [
                    {
                        "field": "messages",
                        "value": {
                            "messaging_product": "whatsapp",
                            "metadata": {
                                "display_phone_number": "919876543210",
                                "phone_number_id": "123456123"
                            },
                            "statuses": [
                                {
                                    "id": `wamid.TEST_DLR_${Date.now()}`,
                                    "status": "delivered",
                                    "timestamp": Math.floor(Date.now() / 1000).toString(),
                                    "recipient_id": "919876839965"
                                }
                            ]
                        }
                    }
                ]
            }
        ]
    };

    try {
        console.log("\n📤 [2] Sending Delivery Report Simulation...");
        const response = await axios.post(WEBHOOK_URL, payload, {
            headers: { 'Content-Type': 'application/json' }
        });
        console.log("✅ Response Status:", response.status);
    } catch (error) {
        console.error("❌ Error:", error.response?.status, error.response?.data || error.message);
    }
}

async function checkResults() {
    try {
        console.log("\n🔍 Checking WhatsApp logs in DB via API...");
        const response = await axios.get('http://localhost:5000/api/webhooks/whatsapp');
        const data = response.data;
        console.log(`\n✅ Total WhatsApp logs found: ${data.data.length}`);
        if (data.data.length > 0) {
            data.data.slice(0, 3).forEach((log, i) => {
                console.log(`\n--- Log #${i + 1} ---`);
                console.log(`  ID       : ${log.id}`);
                console.log(`  Type     : ${log.type}`);
                console.log(`  Sender   : ${log.sender || log.recipient}`);
                console.log(`  Content  : ${log.message_content || '(status update)'}`);
                console.log(`  Status   : ${log.status}`);
                console.log(`  Created  : ${log.created_at}`);
            });
        } else {
            console.log("⚠️  No WhatsApp logs found. The 'type' column may not have been saved correctly.");
        }
    } catch (error) {
        console.error("❌ Could not fetch logs:", error.message);
    }
}

async function runTests() {
    console.log("🚀 WhatsApp Webhook Simulation Started\n");
    await simulateIncomingMessage();
    await new Promise(r => setTimeout(r, 1500));
    await simulateDeliveryReport();
    await new Promise(r => setTimeout(r, 1500));
    await checkResults();
    console.log("\n✨ Done! Open browser: http://localhost:5000/api/webhooks/whatsapp");
}

runTests();
