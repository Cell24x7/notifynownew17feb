const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const authenticateToken = require('../middleware/authMiddleware');

// GET all affiliates for current user
router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const [rows] = await query('SELECT * FROM affiliates WHERE user_id = ? ORDER BY created_at DESC', [userId]);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching affiliates:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Create new affiliate
router.post('/', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const { name, email, referral_code } = req.body;

    if (!name || !email) {
        return res.status(400).json({ success: false, message: 'Name and email are required' });
    }

    const code = referral_code || uuidv4().split('-')[0].toUpperCase();

    try {
        const [result] = await query(
            'INSERT INTO affiliates (user_id, name, email, referral_code) VALUES (?, ?, ?, ?)',
            [userId, name, email, code]
        );
        res.status(201).json({
            success: true,
            message: 'Affiliate created successfully',
            data: { id: result.insertId, name, email, referral_code: code }
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: 'Email or Referral Code already exists' });
        }
        console.error('Error creating affiliate:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Update affiliate (Supports partial updates)
router.put('/:id', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;
    const updates = req.body;

    if (Object.keys(updates).length === 0) {
        return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    const fields = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
        // Only allow updating valid columns
        if (['name', 'email', 'referral_code', 'payout_status', 'status'].includes(key)) {
            fields.push(`${key} = ?`);
            values.push(value);
        }
    }

    if (fields.length === 0) {
        return res.status(400).json({ success: false, message: 'No valid fields provided' });
    }

    values.push(id, userId);

    try {
        await query(
            `UPDATE affiliates SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`,
            values
        );
        res.json({ success: true, message: 'Affiliate updated successfully' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: 'Email or Referral Code already exists' });
        }
        console.error('Error updating affiliate:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Delete affiliate
router.delete('/:id', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;
    try {
        await query('DELETE FROM affiliates WHERE id = ? AND user_id = ?', [id, userId]);
        res.json({ success: true, message: 'Affiliate deleted successfully' });
    } catch (error) {
        console.error('Error deleting affiliate:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

module.exports = router;
