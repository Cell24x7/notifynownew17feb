const https = require('https');

/**
 * Send an SMS message using the NotifyNow API.
 * @param {string} mobile - The mobile number to send the SMS to (10 digits).
 * @param {string} message - The message content.
 * @returns {Promise<any>} - Resolves with the API response or rejects with an error.
 */
const sendSMS = (mobile, message) => {
    return new Promise((resolve, reject) => {
        const user = process.env.SMS_USER;
        const pwd = process.env.SMS_PASSWORD;
        const sender = process.env.SMS_SENDER_ID;
        const mt = 0; // Message Type

        if (!user || !pwd || !sender) {
            console.warn('[SMS] Missing SMS credentials in .env using placeholder');
            // In dev/test without credits, we might want to just log it
            // return resolve({ status: 'mocked', message: 'SMS credentials missing' });
        }

        // Clean mobile number (remove +, spaces, non-digits)
        let cleanMobile = mobile ? mobile.replace(/\D/g, '') : '';
        // If it starts with 91 and is 12 digits, keep it. 
        // If it's 10 digits, it's also fine.
        if (cleanMobile.length > 10 && cleanMobile.startsWith('91')) {
            // Keep 91
        } else if (cleanMobile.length > 10) {
            // Probably has a different country code, trim to last 10 for India simple if needed
            // but for now let's just use the cleaned digits
        }

        const url = `${baseUrl}?user=${encodeURIComponent(user)}&pwd=${encodeURIComponent(pwd)}&sender=${encodeURIComponent(sender)}&mobile=${encodeURIComponent(cleanMobile)}&msg=${encodeURIComponent(message)}&mt=${mt}`;

        console.log(`[SMS] Sending to ${mobile}: ${message}`);
        // console.log(`[SMS] Request URL: ${url}`); // Caution: logs password if enabled

        const req = https.get(url, (res) => {
            let data = '';
            console.log(`[SMS] Provider HTTP Status: ${res.statusCode}`);

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                console.log(`[SMS] Provider Response Content: ${data}`);
                // Most gateways return space-separated key=value or just a job ID
                // If it's a known error keyword, we should probably reject
                if (data.toLowerCase().includes('error') || data.toLowerCase().includes('fail') || data.toLowerCase().includes('invalid')) {
                   reject(new Error(`SMS Gateway Error: ${data}`));
                } else {
                   resolve(data);
                }
            });
        });

        req.on('error', (err) => {
            console.error('[SMS] Error:', err.message);
            reject(err);
        });

        req.end();
    });
};

module.exports = { sendSMS };
