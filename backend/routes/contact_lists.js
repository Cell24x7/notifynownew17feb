const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const authenticate = require('../middleware/authMiddleware');

// GET /api/contact-lists
router.get('/', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        // Fetch lists and count of contacts in each list
        const sql = `
            SELECT l.*, COUNT(m.contact_id) as contact_count 
            FROM contact_lists l
            LEFT JOIN contact_list_members m ON l.id = m.list_id
            WHERE l.user_id = ?
            GROUP BY l.id
            ORDER BY l.created_at DESC
        `;
        const [lists] = await query(sql, [userId]);
        res.json({ success: true, lists });
    } catch (error) {
        console.error('Get contact lists error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch contact lists' });
    }
});

// POST /api/contact-lists
router.post('/', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const { name } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, message: 'List name is required' });
        }

        const listId = uuidv4();
        
        await query(
            'INSERT INTO contact_lists (id, user_id, name) VALUES (?, ?, ?)',
            [listId, userId, name.trim()]
        );

        res.json({ 
            success: true, 
            message: 'List created successfully',
            list: { id: listId, user_id: userId, name: name.trim(), contact_count: 0 }
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: 'A list with this name already exists' });
        }
        console.error('Create contact list error:', error);
        res.status(500).json({ success: false, message: 'Failed to create list' });
    }
});

// DELETE /api/contact-lists/:id
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const listId = req.params.id;

        // Verify ownership
        const [lists] = await query('SELECT id FROM contact_lists WHERE id = ? AND user_id = ?', [listId, userId]);
        if (lists.length === 0) {
            return res.status(404).json({ success: false, message: 'List not found or unauthorized' });
        }

        // Delete from pivot table first
        await query('DELETE FROM contact_list_members WHERE list_id = ?', [listId]);
        
        // Delete list
        await query('DELETE FROM contact_lists WHERE id = ?', [listId]);

        res.json({ success: true, message: 'List deleted successfully' });
    } catch (error) {
        console.error('Delete contact list error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete list' });
    }
});

module.exports = router;
