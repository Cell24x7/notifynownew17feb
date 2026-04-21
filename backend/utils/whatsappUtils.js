const axios = require('axios');

const ADMIN_WHATSAPP_NUMBERS = [
    '918169123456', // Replace with actual admin numbers
    '919167232231'  // Sandbox/Demo numbers
];

/**
 * Send WhatsApp notification to administrators
 * @param {string} message - The message content
 * @param {string} ticketId - Optional ticket reference
 */
const sendAdminWhatsAppNotification = async (message, ticketId = '') => {
    // If no numbers or in local dev without API key, just log
    if (!process.env.INTERNAL_SMS_API_KEY) {
        console.log(`[DEV-WHATSAPP] Admin Alert: ${message}`);
        return;
    }

    const apiKey = process.env.INTERNAL_SMS_API_KEY;
    const baseUrl = process.env.INTERNAL_SMS_URL || 'https://sms.cell24x7.in/otpReceiver/sendSMS';

    for (const mobile of ADMIN_WHATSAPP_NUMBERS) {
        try {
            // Using the same internal endpoint used for OTPs as it's reliable for system alerts
            const url = `${baseUrl}?user=CELL24&pwd=CELL24&sender=NOTIFY&mobile=${mobile}&msg=${encodeURIComponent(message)}&mt=0`;
            
            // Note: This logic assumes the 'INTERNAL' gateway handles WhatsApp or SMS based on the sender/ID
            // If there's a dedicated WhatsApp API for admins, it should be called here.
            
            await axios.get(url, { timeout: 8000 });
            console.log(`✅ Admin WhatsApp Alert sent to ${mobile}`);
        } catch (err) {
            console.error(`❌ Failed to send Admin WhatsApp Alert to ${mobile}:`, err.message);
        }
    }
};

module.exports = { sendAdminWhatsAppNotification };
