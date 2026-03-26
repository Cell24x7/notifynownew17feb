const express = require('express');
const { query } = require('../config/db');
const authenticate = require('../middleware/authMiddleware');

const router = express.Router();

// Middleware to ensure user is admin or authorized reseller
const isAdmin = (req, res, next) => {
    const role = req.user.role;
    const permissions = req.user.permissions || [];

    if (role === 'admin' || role === 'superadmin') {
        return next();
    }

    if (role === 'reseller' && (permissions.includes('RCS Configs - View') || permissions.includes('RCS Configs - Edit'))) {
        return next();
    }

    return res.status(403).json({ success: false, message: 'Unauthorized. Admin access required.' });
};

/**
 * @route GET /api/rcs-configs
 * @desc Get all RCS configurations
 */
router.get('/', authenticate, isAdmin, async (req, res) => {
    try {
        const [configs] = await query('SELECT * FROM rcs_configs ORDER BY created_at DESC');
        res.json({ success: true, configs });
    } catch (error) {
        console.error('❌ Error fetching RCS configs:', error.message);
        res.status(500).json({ success: false, message: 'Failed to fetch RCS configurations' });
    }
});

/**
 * @route POST /api/rcs-configs
 * @desc Create a new RCS configuration
 */
router.post('/', authenticate, isAdmin, async (req, res) => {
    try {
        const { name, auth_url, api_base_url, client_id, client_secret, bot_id } = req.body;

        if (!name || !auth_url || !api_base_url || !client_id || !client_secret || !bot_id) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }

        const [result] = await query(
            'INSERT INTO rcs_configs (name, auth_url, api_base_url, client_id, client_secret, bot_id) VALUES (?, ?, ?, ?, ?, ?)',
            [name, auth_url, api_base_url, client_id, client_secret, bot_id]
        );

        res.status(201).json({
            success: true,
            message: 'RCS Configuration created successfully',
            configId: result.insertId
        });
    } catch (error) {
        console.error('❌ Error creating RCS config:', error.message);
        res.status(500).json({ success: false, message: 'Failed to create RCS configuration' });
    }
});

/**
 * @route PUT /api/rcs-configs/:id
 * @desc Update an RCS configuration
 */
router.put('/:id', authenticate, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, auth_url, api_base_url, client_id, client_secret, bot_id, is_active } = req.body;

        const [existing] = await query('SELECT id FROM rcs_configs WHERE id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'Configuration not found' });
        }

        await query(
            `UPDATE rcs_configs SET 
                name = ?, auth_url = ?, api_base_url = ?, 
                client_id = ?, client_secret = ?, bot_id = ?, 
                is_active = ? 
             WHERE id = ?`,
            [name, auth_url, api_base_url, client_id, client_secret, bot_id, is_active === undefined ? true : is_active, id]
        );

        res.json({ success: true, message: 'RCS Configuration updated successfully' });
    } catch (error) {
        console.error('❌ Error updating RCS config:', error.message);
        res.status(500).json({ success: false, message: 'Failed to update RCS configuration' });
    }
});

/**
 * @route DELETE /api/rcs-configs/:id
 * @desc Delete an RCS configuration
 */
router.delete('/:id', authenticate, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        // Check if config is in use by users
        const [usersInUse] = await query('SELECT id FROM users WHERE rcs_config_id = ? LIMIT 1', [id]);
        if (usersInUse.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete configuration. It is currently assigned to one or more users.'
            });
        }

        const [result] = await query('DELETE FROM rcs_configs WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Configuration not found' });
        }

        res.json({ success: true, message: 'RCS Configuration deleted successfully' });
    } catch (error) {
        console.error('❌ Error deleting RCS config:', error.message);
        res.status(500).json({ success: false, message: 'Failed to delete RCS configuration' });
    }
});

module.exports = router;
