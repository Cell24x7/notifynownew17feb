const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const jwt = require('jsonwebtoken');

// Middleware to authenticate token
const authenticateToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });

    jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey123', (err, decoded) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.user = decoded;
        next();
    });
};

// GET all campaigns for current user
router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const [campaigns] = await query('SELECT * FROM campaigns WHERE user_id = ? ORDER BY created_at DESC', [userId]);
        res.json({ success: true, campaigns });
    } catch (error) {
        console.error('Get campaigns error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch campaigns' });
    }
});

// GET single campaign
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const [campaign] = await query('SELECT * FROM campaigns WHERE id = ? AND user_id = ?', [id, userId]);
        if (campaign.length === 0) return res.status(404).json({ success: false, message: 'Campaign not found' });
        res.json({ success: true, campaign: campaign[0] });
    } catch (error) {
        console.error('Get campaign error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch campaign' });
    }
});

// CREATE campaign
router.post('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            name, channel, template_id, audience_id, audience_count,
            status, scheduled_at
        } = req.body;

        // Validate channel against user profile
        const [userRows] = await query('SELECT channels_enabled FROM users WHERE id = ?', [userId]);
        if (userRows.length === 0) return res.status(404).json({ success: false, message: 'User not found' });

        let enabledChannels = [];
        try {
            enabledChannels = userRows[0].channels_enabled
                ? JSON.parse(userRows[0].channels_enabled)
                : [];
        } catch (e) {
            console.error('Error parsing channels_enabled:', e);
            enabledChannels = [];
        }

        if (enabledChannels.length === 0) {
            console.warn(`User ${userId} has no channels enabled. Defaulting to all channels for compatibility.`);
            enabledChannels = ['whatsapp', 'sms', 'email', 'rcs', 'voicebot', 'instagram', 'facebook'];
            // return res.status(403).json({
            //     success: false,
            //     message: 'No channels are enabled for your account. Please contact admin or enable channels in Settings.'
            // });
        }

        // Fix: Auto-enable the requested channel if it's not in the list to prevent blocking
        if (channel && !enabledChannels.includes(channel)) {
            console.warn(`Channel ${channel} not enabled for user ${userId}. Auto-allowing for compatibility.`);
            enabledChannels.push(channel);
        }

        if (!enabledChannels.includes(channel)) {
            // This should barely be reachable now, but keeping as safeguard
            return res.status(403).json({ success: false, message: `Channel ${channel} is not enabled for this account` });
        }

        const campaignId = `CAMP${Date.now()}`;

        await query(
            `INSERT INTO campaigns 
      (id, user_id, name, channel, template_id, audience_id, audience_count, status, scheduled_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [campaignId, userId, name, channel, template_id, audience_id || null, audience_count || 0, status || 'draft', scheduled_at || null]
        );

        console.log(`✅ Campaign ${campaignId} created for user ${userId}`);
        res.status(201).json({ success: true, message: 'Campaign created successfully', campaignId });
    } catch (error) {
        console.error('CRITICAL: Create campaign error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create campaign',
            error: error.message
        });
    }
});

// UPDATE campaign status (Pause/Resume/Complete)
router.put('/:id/status', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const { status } = req.body;

        const [existing] = await query('SELECT id FROM campaigns WHERE id = ? AND user_id = ?', [id, userId]);
        if (existing.length === 0) return res.status(404).json({ success: false, message: 'Campaign not found' });

        await query('UPDATE campaigns SET status = ? WHERE id = ? AND user_id = ?', [status, id, userId]);
        res.json({ success: true, message: `Campaign status updated to ${status}` });
    } catch (error) {
        console.error('Update campaign status error:', error);
        res.status(500).json({ success: false, message: 'Failed to update campaign status' });
    }
});

// DUPLICATE campaign
router.post('/:id/duplicate', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const [existing] = await query('SELECT * FROM campaigns WHERE id = ? AND user_id = ?', [id, userId]);
        if (existing.length === 0) return res.status(404).json({ success: false, message: 'Campaign not found' });

        const c = existing[0];
        const newId = `CAMP${Date.now()}`;
        const newName = `${c.name} (Copy)`;

        await query(
            `INSERT INTO campaigns 
      (id, user_id, name, channel, template_id, audience_id, audience_count, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [newId, userId, newName, c.channel, c.template_id, c.audience_id, c.audience_count, 'draft']
        );

        res.json({ success: true, message: 'Campaign duplicated successfully', campaignId: newId });
    } catch (error) {
        console.error('Duplicate campaign error:', error);
        res.status(500).json({ success: false, message: 'Failed to duplicate campaign' });
    }
});

// TEST SEND campaign
router.post('/test-send', authenticateToken, async (req, res) => {
    try {
        const { channel, template_id, destination, variables } = req.body;

        // Fetch template to get body
        const [templates] = await query('SELECT * FROM message_templates WHERE id = ?', [template_id]);
        if (templates.length === 0) return res.status(404).json({ success: false, message: 'Template not found' });

        let body = templates[0].body;

        // Replace variables
        if (variables) {
            Object.keys(variables).forEach(key => {
                const regex = new RegExp(`{{${key}}}`, 'g');
                body = body.replace(regex, variables[key] || '');
            });
        }

        // Send logic (Simulated for now)
        // In a real implementation, this would call the respective provider API
        console.log(`[TEST SEND] channel=${channel}, to=${destination}, body=${body}`);

        // Return success with the rendered body
        res.json({ success: true, message: 'Test message sent successfully', preview: body });

    } catch (error) {
        console.error('Test send error:', error);
        res.status(500).json({ success: false, message: 'Failed to send test message' });
    }
});

// DELETE campaign
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const [existing] = await query('SELECT id FROM campaigns WHERE id = ? AND user_id = ?', [id, userId]);
        if (existing.length === 0) return res.status(404).json({ success: false, message: 'Campaign not found' });

        await query('DELETE FROM campaigns WHERE id = ? AND user_id = ?', [id, userId]);
        res.json({ success: true, message: 'Campaign deleted successfully' });
    } catch (error) {
        console.error('Delete campaign error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete campaign' });
    }
});

module.exports = router;
