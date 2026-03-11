const express = require('express');
const { query } = require('../config/db');
const authenticate = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * GET /api/chatflows
 * List all flows for the user
 */
router.get('/', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const [rows] = await query(
            'SELECT * FROM chat_flows WHERE user_id = ? ORDER BY created_at DESC',
            [userId]
        );

        // Parse JSON fields
        const flows = rows.map(row => ({
            ...row,
            keywords: row.keywords ? JSON.parse(row.keywords) : [],
            api_config: row.api_config || {},
            footer_config: row.footer_config || {},
            logic_config: row.logic_config || {}
        }));

        res.json(flows);
    } catch (error) {
        console.error('❌ Get Chatflows Error:', error);
        // Safety: If table doesn't exist, return empty array instead of 500
        if (error.code === 'ER_NO_SUCH_TABLE') {
            return res.json([]);
        }
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * POST /api/chatflows
 * Create a new flow
 */
router.post('/', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            name, category, keywords,
            header_type, header_value, body,
            track_url, api_config, footer_config, logic_config
        } = req.body;

        const keywordsStr = JSON.stringify(keywords || []);
        const apiConfigStr = JSON.stringify(api_config || {});
        const footerConfigStr = JSON.stringify(footer_config || {});
        const logicConfigStr = JSON.stringify(logic_config || {});

        const [result] = await query(
            `INSERT INTO chat_flows (
                user_id, name, category, keywords, 
                header_type, header_value, body, 
                track_url, api_config, footer_config, logic_config
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                userId, name, category, keywordsStr,
                header_type, header_value, body,
                track_url, apiConfigStr, footerConfigStr, logicConfigStr
            ]
        );
        res.json({ success: true, id: result.insertId, message: 'Flow created successfully' });
    } catch (error) {
        console.error('❌ Create Chatflow Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * PUT /api/chatflows/:id
 * Update an existing flow
 */
router.put('/:id', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            name, category, keywords,
            header_type, header_value, body,
            track_url, api_config, footer_config, logic_config
        } = req.body;

        const keywordsStr = JSON.stringify(keywords || []);
        const apiConfigStr = JSON.stringify(api_config || {});
        const footerConfigStr = JSON.stringify(footer_config || {});
        const logicConfigStr = JSON.stringify(logic_config || {});

        await query(
            `UPDATE chat_flows SET 
                name = ?, category = ?, keywords = ?, 
                header_type = ?, header_value = ?, body = ?, 
                track_url = ?, api_config = ?, footer_config = ?, logic_config = ?
            WHERE id = ? AND user_id = ?`,
            [
                name, category, keywordsStr,
                header_type, header_value, body,
                track_url, apiConfigStr, footerConfigStr, logicConfigStr,
                req.params.id, userId
            ]
        );
        res.json({ success: true, message: 'Flow updated successfully' });
    } catch (error) {
        console.error('❌ Update Chatflow Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * PATCH /api/chatflows/:id/status
 * Update status (active/paused)
 */
router.patch('/:id/status', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const { status } = req.body;
        await query(
            'UPDATE chat_flows SET status = ? WHERE id = ? AND user_id = ?',
            [status, req.params.id, userId]
        );
        res.json({ success: true, message: 'Status updated' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * DELETE /api/chatflows/:id
 */
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        await query(
            'DELETE FROM chat_flows WHERE id = ? AND user_id = ?',
            [req.params.id, userId]
        );
        res.json({ success: true, message: 'Flow deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
