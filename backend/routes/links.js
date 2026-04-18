const express = require('express');
const router = express.Router();
const { query } = require('../config/db');

/**
 * GET /l/:trackingId
 * Public Tracking Redirector
 */
router.get('/:trackingId', async (req, res) => {
    const { trackingId } = req.params;

    try {
        // 1. Find the link details
        const [links] = await query('SELECT * FROM link_clicks WHERE tracking_id = ?', [trackingId]);

        if (links.length === 0) {
            // Fallback: If link not found, send to home
            return res.redirect('https://notifynow.in');
        }

        const link = links[0];

        // 2. Log the click (Asynchronous update)
        query('UPDATE link_clicks SET click_count = click_count + 1, last_clicked_at = CURRENT_TIMESTAMP WHERE id = ?', [link.id]);

        // 3. Save as a "Received" message in webhook_logs so it appears in Chat
        try {
            // Fetch campaign name for context
            const [camp] = await query('SELECT name FROM campaigns WHERE id = ? UNION SELECT campaign_name as name FROM api_message_logs WHERE campaign_id = ? LIMIT 1', [link.campaign_id, link.campaign_id]);
            const campName = camp[0]?.name || 'API Campaign';
            const clickText = `User Clicked on Body Link! (Campaign: ${campName})`;
            
            // Try to find bot phone number for better chat grouping
            const [botConfig] = await query('SELECT wanumber as wa_no FROM whatsapp_configs WHERE id = (SELECT whatsapp_config_id FROM users WHERE id = ?)', [link.user_id]);
            const botNumber = botConfig[0]?.wa_no || 'System';

            const [saveRes] = await query(
                'INSERT INTO webhook_logs (user_id, sender, recipient, message_content, status, type) VALUES (?, ?, ?, ?, "received", "whatsapp")',
                [link.user_id, link.mobile, botNumber, clickText]
            );

            // 4. Emit real-time notification to the user
            if (req.io && link.user_id) {
                req.io.to(`user_${link.user_id}`).emit('new_message', {
                    id: saveRes.insertId,
                    sender: link.mobile,
                    recipient: botNumber,
                    message_content: clickText,
                    status: 'received',
                    type: 'whatsapp',
                    created_at: new Date()
                });
            }
        } catch (e) { console.error('Error saving click to logs:', e.message); }

        // 5. Redirect to original URL
        res.redirect(link.original_url);

    } catch (error) {
        console.error('❌ Link Tracking Error:', error.message);
        res.redirect('https://notifynow.in');
    }
});

module.exports = router;
