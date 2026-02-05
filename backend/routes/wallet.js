const express = require('express');
const { query } = require('../config/db');
const authenticateToken = require('../middleware/authMiddleware'); // Ensure auth middleware is used

const router = express.Router();

// Get Wallet Balance
// Get Wallet Balance
router.get('/balance', authenticateToken, async (req, res) => {
  try {
    const [rows] = await query('SELECT wallet_balance FROM users WHERE id = ?', [req.user.id]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, balance: parseFloat(rows[0].wallet_balance) || 0 });
  } catch (err) {
    console.error('BALANCE ERROR:', err.message);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET wallet transactions (Admin sees all, User sees theirs)
router.get('/transactions', authenticateToken, async (req, res) => {
  try {
    let sql = `
      SELECT 
        t.id, t.type, t.amount, t.description, t.status, t.created_at,
        u.name as client_name, u.email as client_email
      FROM transactions t
      LEFT JOIN users u ON t.user_id = u.id
    `;

    const params = [];

    // If not admin, filter by user_id
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      sql += ' WHERE t.user_id = ?';
      params.push(req.user.id);
    }

    sql += ' ORDER BY t.created_at DESC';

    const [rows] = await query(sql, params);

    res.json({ success: true, transactions: rows });
  } catch (err) {
    console.error('TRANSACTIONS ERROR:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Recharge Wallet (Simulated)
router.post('/recharge', authenticateToken, async (req, res) => {
  const { amount } = req.body;
  const user_id = req.user.id; // Use authenticated user ID

  if (!amount || amount <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid amount' });
  }

  try {
    // 1. Update user balance
    await query(`
      UPDATE users 
      SET wallet_balance = wallet_balance + ?
      WHERE id = ?
    `, [amount, user_id]);

    // 2. Log transaction
    const [result] = await query(`
      INSERT INTO transactions (
        user_id, type, amount, description, status
      ) VALUES (?, 'credit', ?, 'Wallet Recharge', 'completed')
    `, [user_id, amount]);

    // 3. Get updated balance
    const [userRows] = await query('SELECT wallet_balance FROM users WHERE id = ?', [user_id]);
    const newBalance = parseFloat(userRows[0].wallet_balance);

    res.json({ success: true, message: 'Wallet recharged successfully', balance: newBalance, transactionId: result.insertId });
  } catch (err) {
    console.error('RECHARGE ERROR:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin Adjust Wallet (Credit/Debit)
router.post('/adjust', authenticateToken, async (req, res) => {
  // Only admin/superadmin can adjust
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }

  const { user_id, type, credits, description } = req.body; // 'credits' here means Amount (Money)

  if (!user_id || credits === undefined || credits === null || !type) {
    return res.status(400).json({ success: false, message: 'Missing required fields: user_id, credits, or type' });
  }

  const amount = parseFloat(credits);
  if (isNaN(amount)) {
    return res.status(400).json({ success: false, message: 'Credits must be a valid number' });
  }

  const isCredit = type === 'adjustment' || type === 'credit'; // 'adjustment' from frontend usually means ADD

  // Determine the amount to add/subtract
  // If type is 'deduction', we subtract (add negative)
  // If type is 'adjustment' or 'refund', we add (add positive)
  let finalAmount = Math.abs(amount);
  if (type === 'deduction') {
    finalAmount = -finalAmount;
  }

  try {
    // 1. Update user balance
    await query(`
        UPDATE users 
        SET wallet_balance = wallet_balance + ?
        WHERE id = ?
      `, [finalAmount, user_id]);

    // 2. Log transaction
    // Use 'credit' or 'debit' for the DB status if strict, but we changed column to VARCHAR so 'adjustment' etc is also fine if we wanted.
    // However, keeping consistent with 'credit'/'debit' logic is good.
    const dbType = finalAmount >= 0 ? 'credit' : 'debit';

    await query(`
        INSERT INTO transactions (
          user_id, type, amount, description, status
        ) VALUES (?, ?, ?, ?, 'completed')
      `, [user_id, dbType, Math.abs(finalAmount), description || 'Admin Adjustment']);

    res.json({ success: true, message: 'Wallet adjusted successfully' });
  } catch (err) {
    console.error('ADJUST ERROR:', err.message);
    // Check for specific DB errors to give better feedback
    if (err.code === 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD') {
      return res.status(400).json({ success: false, message: 'Invalid data format for database' });
    }
    res.status(500).json({ success: false, message: 'Database error: ' + err.message });
  }
});

module.exports = router;