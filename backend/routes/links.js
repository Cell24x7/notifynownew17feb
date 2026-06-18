const express = require('express');
const router = express.Router();
const shortLinkService = require('../services/shortLinkService');
const { query } = require('../config/db');

/**
 * GET /l/:shortCode
 * Public Tracking Redirector
 */
router.get('/:shortCode', async (req, res) => {
    const { shortCode } = req.params;

    try {
        const userAgent = (req.headers['user-agent'] || '').toLowerCase();
        
        // List of common link preview bots/crawlers to ignore
        const isBot = [
            'whatsapp', 'facebookexternalhit', 'facebot', 'twitterbot', 
            'linkedinbot', 'telegrambot', 'slackbot', 'bot', 'crawler', 'spider'
        ].some(bot => userAgent.includes(bot));

        if (isBot) {
            // Find just the long url without tracking click
            const [links] = await query('SELECT long_url FROM short_links WHERE short_code = ?', [shortCode]);
            if (links.length > 0) {
                return res.redirect(links[0].long_url);
            }
            return res.redirect('https://notifynow.in');
        }

        const reqInfo = {
            ip: req.ip || req.connection.remoteAddress,
            userAgent: req.headers['user-agent']
        };

        const longUrl = await shortLinkService.handleRedirect(shortCode, reqInfo);

        if (longUrl) {
            res.redirect(longUrl);
        } else {
            res.redirect('https://notifynow.in');
        }

    } catch (error) {
        console.error('❌ Link Tracking Error:', error.message);
        res.redirect('https://notifynow.in');
    }
});

module.exports = router;
