const fs = require('fs');
const path = require('path');

const webhooksPath = path.join(__dirname, '..', 'routes', 'webhooks.js');
const content = fs.readFileSync(webhooksPath, 'utf8');

console.log("=== SEARCHING FOR DLR OR WEBHOOK FORWARDING IN WEBHOOKS.JS ===");
const lines = content.split('\n');
lines.forEach((line, index) => {
    if (line.toLowerCase().includes('dlr') || line.toLowerCase().includes('forward') || line.toLowerCase().includes('webhook_url')) {
        console.log(`Line ${index + 1}: ${line.trim()}`);
    }
});
