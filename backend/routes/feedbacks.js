const express = require('express');
const { query } = require('../config/db');
const router = express.Router();

/**
 * GET /api/feedbacks
 * Fetch public feedbacks, ordered by latest
 */
router.get('/', async (req, res) => {
    try {
        const [rows] = await query(
            'SELECT name, designation, company, rating, message, created_at FROM feedbacks WHERE is_public = 1 ORDER BY created_at DESC LIMIT 20'
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('❌ Get Feedbacks Error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch feedbacks' });
    }
});

/**
 * POST /api/feedbacks
 * Submit new feedback
 */
router.post('/', async (req, res) => {
    try {
        const { name, designation, company, rating, message } = req.body;

        if (!name || !rating || !message) {
            return res.status(400).json({ success: false, message: 'Name, rating, and message are required' });
        }

        const [result] = await query(
            'INSERT INTO feedbacks (name, designation, company, rating, message, is_public, created_at) VALUES (?, ?, ?, ?, ?, 1, NOW())',
            [name, designation || '', company || '', rating, message]
        );

        res.json({ success: true, id: result.insertId, message: 'Feedback submitted successfully' });
    } catch (error) {
        console.error('❌ Submit Feedback Error:', error);
        res.status(500).json({ success: false, message: 'Failed to submit feedback' });
    }
});

module.exports = router;
