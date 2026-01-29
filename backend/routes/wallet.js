const express = require('express');
const { query } = require('../config/db');

const router = express.Router();

// GET wallet transactions
router.get('/transactions', async (req, res) => {
  try {
    const [rows] = await query(`
      SELECT 
        t.id, t.type, t.amount, t.credits, t.description, t.status, t.created_at,
        u.name AS client_name
      FROM transactions t
      LEFT JOIN users u ON t.user_id = u.id
      ORDER BY t.created_at DESC
    `);
    res.json({ success: true, transactions: rows });
  } catch (err) {
    console.error('TRANSACTIONS ERROR:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ADJUST credits (add/refund)
router.post('/adjust', async (req, res) => {
  const { user_id, type, credits, description } = req.body;

  if (!user_id || !type || !credits || !description) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  if (!['adjustment', 'refund'].includes(type)) {
    return res.status(400).json({ success: false, message: 'Invalid type' });
  }

  try {
    await query(`
      UPDATE users 
      SET credits_available = credits_available + ?
      WHERE id = ? AND role = 'user'
    `, [credits, user_id]);

    const [result] = await query(`
      INSERT INTO transactions (
        user_id, type, amount, credits, description, status
      ) VALUES (?, ?, 0, ?, ?, 'completed')
    `, [user_id, type, credits, description]);

    res.json({ success: true, id: result.insertId });
  } catch (err) {
    console.error('ADJUST CREDITS ERROR:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;