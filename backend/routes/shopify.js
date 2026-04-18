const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { sendUniversalMessage } = require('../services/sendingService');

/**
 * POST /api/shopify/order-placed
 * Webhook handler for Shopify 'Order Creation'
 */
router.post('/order-placed', async (req, res) => {
    try {
        const payload = req.body;
        
        // 1. Extract Details from Shopify Payload
        const orderId = payload.name || payload.id;
        const firstName = payload.customer?.first_name || 'Customer';
        const mobile = payload.customer?.phone || payload.shipping_address?.phone || payload.billing_address?.phone;
        const totalPrice = payload.total_price;
        const currency = payload.currency;
        const checkoutUrl = payload.order_status_url || payload.checkout_id;

        console.log(`[Shopify-Hook] Received Order ${orderId} for ${firstName} (${mobile})`);

        if (!mobile) {
            console.warn(`[Shopify-Hook] No mobile number found for Order ${orderId}. Skipping WhatsApp.`);
            return res.status(200).json({ success: false, message: 'No phone number' });
        }

        // 2. Identify User (You need to define which NotifyNow user this belongs to)
        // For now, we'll try to find a user by a custom header or default to Admin (ID: 1)
        const userId = req.headers['x-notifynow-user-id'] || 1; 

        // 3. Trigger WhatsApp Message
        // You should have a template named 'shopify_order_confirm' or similar ready
        const templateName = 'shopify_order_confirm'; 
        
        const result = await sendUniversalMessage({
            user_id: userId,
            channel: 'whatsapp',
            mobile: mobile.replace(/\D/g, ''),
            template_name: templateName,
            variables: {
                "1": firstName,
                "2": orderId,
                "3": `${totalPrice} ${currency}`,
                "4": checkoutUrl
            },
            campaign_id: `SHOPIFY_${orderId}`,
            campaign_name: `Shopify Order: ${orderId}`
        });

        console.log(`[Shopify-Hook] WhatsApp sent for ${orderId}. Result: ${result.success ? 'Success' : 'Failed'}`);

        // 4. Log to database for dashboard tracking
        if (result.success && result.messageId) {
            try {
                await query(
                    'INSERT INTO message_logs (user_id, campaign_id, campaign_name, recipient, message_content, status, type, message_id, channel) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [userId, `SHOPIFY_${orderId}`, `Shopify Order: ${orderId}`, mobile.replace(/\D/g, ''), `Order Confirmation for ${orderId}`, 'sent', 'whatsapp', result.messageId, 'whatsapp']
                );
            } catch (e) { console.error('Shopify Log Error:', e.message); }
        }

        res.status(200).json({ success: true, message: 'Processed successfully' });

    } catch (error) {
        console.error('❌ Shopify Webhook Error:', error.message);
        res.status(200).json({ success: false, error: error.message }); // Always return 200 to Shopify to avoid retries
    }
});

module.exports = router;
