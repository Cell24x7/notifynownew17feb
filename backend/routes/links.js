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
            const clickText = `🔗 [Engagement]: User clicked on link: ${link.original_url}`;
            await query(
                'INSERT INTO webhook_logs (user_id, sender, recipient, message_content, status, type) VALUES (?, ?, ?, ?, "received", "whatsapp")',
                [link.user_id, link.mobile, 'System', clickText]
            );
        } catch (e) { console.error('Error saving click to logs:', e.message); }

        // 4. Emit real-time notification to the user if io is available
        if (req.io && link.user_id) {
            // Emit unique tracking event
            req.io.to(`user_${link.user_id}`).emit('link_click', {
                mobile: link.mobile,
                url: link.original_url,
                time: new Date()
            });
        }

        // 5. Redirect to original URL
        res.redirect(link.original_url);

    } catch (error) {
        console.error('❌ Link Tracking Error:', error.message);
        res.redirect('https://notifynow.in');
    }
});

module.exports = router;
