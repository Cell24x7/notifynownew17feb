const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const authenticate = require('../middleware/authMiddleware');

// Get user's email configs
router.get('/', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const [configs] = await query('SELECT * FROM email_configs WHERE user_id = ? ORDER BY id DESC', [userId]);
        res.json({ success: true, configs });
    } catch (error) {
        console.error('Get email configs error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch email configurations' });
    }
});

// Save or Update email config
router.post('/', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id, name, host, port, secure, user, pass, from_email, from_name, is_active } = req.body;

        if (id) {
            await query(
                `UPDATE email_configs SET 
                name = ?, host = ?, port = ?, secure = ?, user = ?, pass = ?, from_email = ?, from_name = ?, is_active = ? 
                WHERE id = ? AND user_id = ?`,
                [name, host, port, secure, user, pass, from_email, from_name, is_active, id, userId]
            );
            res.json({ success: true, message: 'Configuration updated successfully' });
        } else {
            const [result] = await query(
                `INSERT INTO email_configs (user_id, name, host, port, secure, user, pass, from_email, from_name) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [userId, name, host, port, secure, user, pass, from_email, from_name]
            );
            
            // Auto-assign to user if it's their only config
            const [count] = await query('SELECT COUNT(*) as count FROM email_configs WHERE user_id = ?', [userId]);
            if (count[0].count === 1) {
                await query('UPDATE users SET email_config_id = ? WHERE id = ?', [result.insertId, userId]);
            }
            
            res.json({ success: true, message: 'Configuration saved successfully', id: result.insertId });
        }
    } catch (error) {
        console.error('Save email config error:', error);
        res.status(500).json({ success: false, message: 'Failed to save email configuration' });
    }
});

module.exports = router;
