const express = require('express');
const { query } = require('../config/db');
const authenticate = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * GET /api/automations
 * List all automations for the user
 */
router.get('/', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const [rows] = await query(
            'SELECT * FROM automations WHERE user_id = ? ORDER BY created_at DESC',
            [userId]
        );

        const automations = rows.map(row => ({
            ...row,
            nodes: typeof row.nodes === 'string' ? JSON.parse(row.nodes) : row.nodes,
            edges: typeof row.edges === 'string' ? JSON.parse(row.edges) : row.edges,
            triggerCount: row.trigger_count,
            createdAt: row.created_at,
            lastTriggered: row.last_triggered
        }));

        res.json(automations);
    } catch (error) {
        console.error('❌ Get Automations Error:', error);
        if (error.code === 'ER_NO_SUCH_TABLE') return res.json([]);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * POST /api/automations
 * Create a new automation
 */
router.post('/', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, trigger_type, channel, nodes, edges } = req.body;

        const [result] = await query(
            `INSERT INTO automations (user_id, name, trigger_type, channel, nodes, edges, status)
             VALUES (?, ?, ?, ?, ?, ?, 'draft')`,
            [userId, name, trigger_type || 'new_message', channel || 'whatsapp', JSON.stringify(nodes || []), JSON.stringify(edges || [])]
        );

        res.json({ success: true, id: result.insertId, message: 'Automation created successfuly' });
    } catch (error) {
        console.error('❌ Create Automation Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * PUT /api/automations/:id
 * Update automation nodes/edges
 */
router.put('/:id', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, nodes, edges, status, trigger_type, channel } = req.body;

        await query(
            `UPDATE automations SET 
                name = COALESCE(?, name),
                nodes = COALESCE(?, nodes),
                edges = COALESCE(?, edges),
                status = COALESCE(?, status),
                trigger_type = COALESCE(?, trigger_type),
                channel = COALESCE(?, channel)
            WHERE id = ? AND user_id = ?`,
            [name, JSON.stringify(nodes), JSON.stringify(edges), status, trigger_type, channel, req.params.id, userId]
        );

        res.json({ success: true, message: 'Automation updated' });
    } catch (error) {
        console.error('❌ Update Automation Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * PATCH /api/automations/:id/status
 */
router.patch('/:id/status', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const { status } = req.body;
        await query('UPDATE automations SET status = ? WHERE id = ? AND user_id = ?', [status, req.params.id, userId]);
        res.json({ success: true, message: 'Status updated' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * DELETE /api/automations/:id
 */
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        await query('DELETE FROM automations WHERE id = ? AND user_id = ?', [req.params.id, userId]);
        res.json({ success: true, message: 'Automation deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * POST /api/automations/:id/test
 * Manually trigger the automation for testing
 */
const { executeNode } = require('../services/automationService');

router.post('/:id/test', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const { testPhone } = req.body;

        if (!testPhone) {
            return res.status(400).json({ success: false, message: 'Test phone number is required' });
        }

        const [rows] = await query('SELECT * FROM automations WHERE id = ? AND user_id = ?', [id, userId]);
        if (!rows || rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Automation not found' });
        }

        const automation = rows[0];
        const nodes = typeof automation.nodes === 'string' ? JSON.parse(automation.nodes) : automation.nodes;
        const edges = typeof automation.edges === 'string' ? JSON.parse(automation.edges) : automation.edges;

        const triggerNode = nodes.find(n => n.type === 'trigger');
        if (!triggerNode) {
            return res.status(400).json({ success: false, message: 'No trigger node found in this automation' });
        }

        const payload = {
            sender: testPhone,
            message_content: 'TEST_TRIGGER',
            isTest: true
        };

        // Execute the flow
        await executeNode(userId, triggerNode, nodes, edges, automation.channel || 'whatsapp', payload, null);

        res.json({ success: true, message: 'Test triggered successfully. Check your phone!' });
    } catch (error) {
        console.error('❌ Test Automation Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
