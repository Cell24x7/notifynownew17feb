const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ success: false, message: 'Invalid token' });
    }
};

router.get('/stats', authenticate, async (req, res) => {
    try {
        // Get user's enabled channels
        const [userRows] = await query('SELECT channels_enabled FROM users WHERE id = ?', [req.user.id]);
        let channels = [];
        try {
            if (userRows[0]?.channels_enabled) {
                channels = JSON.parse(userRows[0].channels_enabled);
            }
        } catch (e) {
            channels = [];
        }
        if (!Array.isArray(channels)) channels = [];

        // Mock stats
        const stats = {
            totalConversations: 0,
            activeChats: 0,
            automationsTriggered: 0,
            campaignsSent: 0,
            openChats: 0,
            closedChats: 0,
            weeklyChats: [
                { day: 'Mon', count: 0 },
                { day: 'Tue', count: 0 },
                { day: 'Wed', count: 0 },
                { day: 'Thu', count: 0 },
                { day: 'Fri', count: 0 },
                { day: 'Sat', count: 0 },
                { day: 'Sun', count: 0 },
            ],
            channelDistribution: {
                whatsapp: channels.includes('whatsapp') ? 1 : 0,
                sms: channels.includes('sms') ? 1 : 0,
                email: channels.includes('email') ? 1 : 0,
                instagram: 0,
                facebook: 0,
                rcs: 0,
                voicebot: 0
            }
        };

        res.json({ success: true, stats });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
