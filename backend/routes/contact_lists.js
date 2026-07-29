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

// POST /api/contact-lists/assign
router.post('/assign', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const { list_id, contact_ids } = req.body;

        if (!list_id || !contact_ids || !Array.isArray(contact_ids) || contact_ids.length === 0) {
            return res.status(400).json({ success: false, message: 'list_id and contact_ids array are required' });
        }

        // Verify list ownership
        const [lists] = await query('SELECT id FROM contact_lists WHERE id = ? AND user_id = ?', [list_id, userId]);
        if (lists.length === 0) {
            return res.status(404).json({ success: false, message: 'List not found' });
        }

        // Verify contacts belong to user
        const [contacts] = await query('SELECT id FROM contacts WHERE user_id = ? AND id IN (?)', [userId, contact_ids]);
        const validContactIds = contacts.map(c => c.id);

        if (validContactIds.length === 0) {
            return res.status(400).json({ success: false, message: 'No valid contacts found to assign' });
        }

        // Prepare bulk insert
        const values = validContactIds.map(id => [list_id, id]);
        
        // Insert with IGNORE to avoid duplicate errors if already in list
        await query('INSERT IGNORE INTO contact_list_members (list_id, contact_id) VALUES ?', [values]);

        res.json({ success: true, message: `Assigned ${validContactIds.length} contacts to list successfully` });
    } catch (error) {
        console.error('Assign to list error:', error);
        res.status(500).json({ success: false, message: 'Failed to assign contacts to list' });
    }
});

module.exports = router;
