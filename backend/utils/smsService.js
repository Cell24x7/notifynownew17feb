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

        // Construct URL with query parameters
        const baseUrl = 'https://sms.cell24x7.in/otpReceiver/sendSMS';
        const params = new URLSearchParams({
            user: user,
            pwd: pwd,
            sender: sender,
            mobile: mobile,
            msg: message,
            mt: mt
        });

        const url = `${baseUrl}?${params.toString()}`;

        console.log(`[SMS] Sending to ${mobile}: ${message}`);
        // console.log(`[SMS] Request URL: ${url}`); // Caution: logs password if enabled

        const req = https.get(url, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                // Log response for debugging (e.g., "JobId=...")
                console.log(`[SMS] Response: ${data}`);
                resolve(data);
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
