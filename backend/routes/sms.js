const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const authenticateToken = require('../middleware/authMiddleware');

// GET all SMS channels for user
router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const [channels] = await query('SELECT * FROM sms_channels WHERE user_id = ? ORDER BY created_at DESC', [userId]);
        res.json({ success: true, channels });
    } catch (error) {
        console.error('Get SMS channels error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch SMS channels' });
    }
});

// GET single SMS channel
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const [channels] = await query('SELECT * FROM sms_channels WHERE id = ? AND user_id = ?', [id, userId]);

        if (channels.length === 0) {
            return res.status(404).json({ success: false, message: 'Channel not found' });
        }

        res.json({ success: true, channel: channels[0] });
    } catch (error) {
        console.error('Get SMS channel error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch SMS channel details' });
    }
});

// CREATE new SMS channel
router.post('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            channelName, defaultSenderId, country, timezone,
            apiBaseUrl, apiKey, apiSecret, authType,
            messageType, enableLongSms, autoTrim,
            costPerSms, creditDeductionMode, initialCreditLimit,
            optInRequired, optOutKeyword, quietHoursStart, quietHoursEnd
        } = req.body;

        // Validation
        if (!channelName || !defaultSenderId || !apiBaseUrl || !apiKey || !authType) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        const [result] = await query(`
            INSERT INTO sms_channels (
                user_id, channel_name, default_sender_id, country, timezone,
                api_base_url, api_key, api_secret, auth_type,
                message_type, enable_long_sms, auto_trim,
                cost_per_sms, credit_deduction_mode, initial_credit_limit,
                opt_in_required, opt_out_keyword, quiet_hours_start, quiet_hours_end,
                status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
        `, [
            userId, channelName, defaultSenderId, country, timezone,
            apiBaseUrl, apiKey, apiSecret, authType,
            messageType || 'gsm', enableLongSms ? 1 : 0, autoTrim ? 1 : 0,
            costPerSms || 0.05, creditDeductionMode || 'per_sms', initialCreditLimit || 1000,
            optInRequired ? 1 : 0, optOutKeyword, quietHoursStart, quietHoursEnd
        ]);

        // Also update users table to enable 'sms' channel if not already enabled
        const [userRows] = await query('SELECT channels_enabled FROM users WHERE id = ?', [userId]);
        if (userRows.length > 0) {
            let channels = [];
            try {
                if (userRows[0].channels_enabled) {
                    channels = JSON.parse(userRows[0].channels_enabled);
                }
            } catch (e) { channels = []; }

            if (!Array.isArray(channels)) channels = [];

            if (!channels.includes('sms')) {
                channels.push('sms');
                await query('UPDATE users SET channels_enabled = ? WHERE id = ?', [JSON.stringify(channels), userId]);
            }
        }

        res.status(201).json({
            success: true,
            message: 'SMS Channel created successfully',
            id: result.insertId
        });
    } catch (error) {
        console.error('Create SMS channel error:', error);
        res.status(500).json({ success: false, message: 'Failed to create SMS channel' });
    }
});

// UPDATE SMS channel
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const {
            channelName, defaultSenderId, country, timezone,
            apiBaseUrl, apiKey, apiSecret, authType,
            messageType, enableLongSms, autoTrim,
            costPerSms, creditDeductionMode, initialCreditLimit,
            optInRequired, optOutKeyword, quietHoursStart, quietHoursEnd,
            status
        } = req.body;

        // Check ownership
        const [existing] = await query('SELECT id FROM sms_channels WHERE id = ? AND user_id = ?', [id, userId]);
        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'Channel not found' });
        }

        await query(`
            UPDATE sms_channels SET
                channel_name = COALESCE(?, channel_name), 
                default_sender_id = COALESCE(?, default_sender_id), 
                country = COALESCE(?, country), 
                timezone = COALESCE(?, timezone),
                api_base_url = COALESCE(?, api_base_url), 
                api_key = COALESCE(?, api_key), 
                api_secret = COALESCE(?, api_secret), 
                auth_type = COALESCE(?, auth_type),
                message_type = COALESCE(?, message_type), 
                enable_long_sms = COALESCE(?, enable_long_sms), 
                auto_trim = COALESCE(?, auto_trim),
                cost_per_sms = COALESCE(?, cost_per_sms), 
                credit_deduction_mode = COALESCE(?, credit_deduction_mode), 
                initial_credit_limit = COALESCE(?, initial_credit_limit),
                opt_in_required = COALESCE(?, opt_in_required), 
                opt_out_keyword = COALESCE(?, opt_out_keyword), 
                quiet_hours_start = COALESCE(?, quiet_hours_start), 
                quiet_hours_end = COALESCE(?, quiet_hours_end),
                status = COALESCE(?, status)
            WHERE id = ? AND user_id = ?
        `, [
            channelName, defaultSenderId, country, timezone,
            apiBaseUrl, apiKey, apiSecret, authType,
            messageType, enableLongSms !== undefined ? (enableLongSms ? 1 : 0) : null,
            autoTrim !== undefined ? (autoTrim ? 1 : 0) : null,
            costPerSms, creditDeductionMode, initialCreditLimit,
            optInRequired !== undefined ? (optInRequired ? 1 : 0) : null,
            optOutKeyword, quietHoursStart, quietHoursEnd,
            status, id, userId
        ]);

        res.json({ success: true, message: 'SMS Channel updated successfully' });
    } catch (error) {
        console.error('Update SMS channel error:', error);
        res.status(500).json({ success: false, message: 'Failed to update SMS channel' });
    }
});

// DELETE SMS channel
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const [existing] = await query('SELECT id FROM sms_channels WHERE id = ? AND user_id = ?', [id, userId]);
        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'Channel not found' });
        }

        await query('DELETE FROM sms_channels WHERE id = ? AND user_id = ?', [id, userId]);
        res.json({ success: true, message: 'SMS Channel deleted successfully' });
    } catch (error) {
        console.error('Delete SMS channel error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete SMS channel' });
    }
});

module.exports = router;
