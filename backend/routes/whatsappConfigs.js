const express = require('express');
const { query } = require('../config/db');
const authenticate = require('../middleware/authMiddleware');

const router = express.Router();

// Middleware to ensure user is admin or authorized reseller
const isAdmin = (req, res, next) => {
    const role = req.user.role;
    let permissions = req.user.permissions || [];
    if (typeof permissions === 'string') {
        try { permissions = JSON.parse(permissions); } catch (e) { permissions = []; }
    }
    if (!Array.isArray(permissions)) permissions = [];

    if (role === 'admin' || role === 'superadmin') {
        return next();
    }

    if (role === 'reseller') {
        const hasViewPerm = permissions.some(p => p.feature === 'WhatsApp Configs - View' && (p.admin === true || p.admin === 1));
        const hasEditPerm = permissions.some(p => p.feature === 'WhatsApp Configs - Edit' && (p.admin === true || p.admin === 1));
        
        if (hasViewPerm || hasEditPerm) {
            return next();
        }
    }

    return res.status(403).json({ success: false, message: 'Unauthorized. Admin access required.' });
};

/**
 * @route GET /api/whatsapp-configs
 * @desc Get all WhatsApp configurations
 */
router.get('/', authenticate, isAdmin, async (req, res) => {
    try {
        const [configs] = await query('SELECT * FROM whatsapp_configs ORDER BY created_at DESC');
        res.json({ success: true, configs });
    } catch (error) {
        console.error('❌ Error fetching WhatsApp configs:', error.message);
        res.status(500).json({ success: false, message: 'Failed to fetch WhatsApp configurations' });
    }
});

/**
 * @route POST /api/whatsapp-configs
 * @desc Create a new WhatsApp configuration
 */
router.post('/', authenticate, isAdmin, async (req, res) => {
    try {
        const { chatbot_name, provider, wanumber, domain, customer_id, wa_token, api_key, ph_no_id, wa_biz_accnt_id } = req.body;

        if (!chatbot_name || (provider === 'vendor1' && (!wa_token || !ph_no_id || !wa_biz_accnt_id)) || (provider === 'vendor2' && (!api_key || !ph_no_id || !wa_biz_accnt_id))) {
            return res.status(400).json({ success: false, message: 'Required fields are missing' });
        }

        const [result] = await query(
            'INSERT INTO whatsapp_configs (chatbot_name, provider, wanumber, domain, customer_id, wa_token, api_key, ph_no_id, wa_biz_accnt_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [chatbot_name, provider || 'vendor1', wanumber, domain, customer_id, wa_token, api_key, ph_no_id, wa_biz_accnt_id]
        );

        res.status(201).json({
            success: true,
            message: 'WhatsApp Configuration created successfully',
            configId: result.insertId
        });
    } catch (error) {
        console.error('❌ Error creating WhatsApp config:', error.message);
        res.status(500).json({ success: false, message: 'Failed to create WhatsApp configuration' });
    }
});

/**
 * @route PUT /api/whatsapp-configs/:id
 * @desc Update a WhatsApp configuration
 */
router.put('/:id', authenticate, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { chatbot_name, provider, wanumber, domain, customer_id, wa_token, api_key, ph_no_id, wa_biz_accnt_id, is_active } = req.body;

        const [existing] = await query('SELECT id FROM whatsapp_configs WHERE id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'Configuration not found' });
        }

        await query(
            `UPDATE whatsapp_configs SET 
                chatbot_name = ?, provider = ?, wanumber = ?, domain = ?, customer_id = ?, 
                wa_token = ?, api_key = ?, ph_no_id = ?, wa_biz_accnt_id = ?, 
                is_active = ? 
             WHERE id = ?`,
            [chatbot_name, provider || 'vendor1', wanumber, domain, customer_id, wa_token, api_key, ph_no_id, wa_biz_accnt_id, is_active === undefined ? true : is_active, id]
        );

        res.json({ success: true, message: 'WhatsApp Configuration updated successfully' });
    } catch (error) {
        console.error('❌ Error updating WhatsApp config:', error.message);
        res.status(500).json({ success: false, message: 'Failed to update WhatsApp configuration' });
    }
});

/**
 * @route DELETE /api/whatsapp-configs/:id
 * @desc Delete a WhatsApp configuration
 */
router.delete('/:id', authenticate, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        // Check if config is in use by users
        const [usersInUse] = await query('SELECT id FROM users WHERE whatsapp_config_id = ? LIMIT 1', [id]);
        if (usersInUse.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete configuration. It is currently assigned to one or more users.'
            });
        }

        const [result] = await query('DELETE FROM whatsapp_configs WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Configuration not found' });
        }

        res.json({ success: true, message: 'WhatsApp Configuration deleted successfully' });
    } catch (error) {
        console.error('❌ Error deleting WhatsApp config:', error.message);
        res.status(500).json({ success: false, message: 'Failed to delete WhatsApp configuration' });
    }
});

module.exports = router;
