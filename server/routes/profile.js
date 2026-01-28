// routes/profile.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

const router = express.Router();

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('JWT_SECRET missing in profile routes!');
  process.exit(1);
}

// GET /api/profile
router.get('/', authenticate, async (req, res) => {
  try {
    const [rows] = await query(
      `SELECT id, name, email, company, contact_phone, plan_id, 
              credits_available, credits_used, status, created_at 
       FROM users WHERE id = ?`,
      [req.user.id]
    );

    if (!rows.length) return res.status(404).json({ success: false });

    res.json({ success: true, user: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/profile
router.put('/', authenticate, async (req, res) => {
  const { name, company, contact_phone } = req.body;

  const updates = [];
  const values = [];

  if (name && name.trim()) {
    updates.push('name = ?');
    values.push(name.trim());
  }
  if (company !== undefined) {
    updates.push('company = ?');
    values.push(company.trim() || null);
  }
  if (contact_phone !== undefined) {
    updates.push('contact_phone = ?');
    values.push(contact_phone.trim() || null);
  }

  if (!updates.length) {
    return res.status(400).json({ success: false, message: 'No changes provided' });
  }

  try {
    values.push(req.user.id);
    await query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);

    // Return updated user
    const [updated] = await query(
      `SELECT id, name, email, company, contact_phone, plan_id, credits_available 
       FROM users WHERE id = ?`,
      [req.user.id]
    );

    res.json({ success: true, user: updated[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Update failed' });
  }
});

// PUT /api/change-password
router.put('/change-password', authenticate, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: 'Both passwords required' });
  }

  try {
    const [rows] = await query('SELECT password FROM users WHERE id = ?', [req.user.id]);
    if (!rows.length) return res.status(404).json({ success: false });

    const match = await bcrypt.compare(currentPassword, rows[0].password);
    if (!match) return res.status(401).json({ success: false, message: 'Current password incorrect' });

    const hash = await bcrypt.hash(newPassword, 10);
    await query('UPDATE users SET password = ? WHERE id = ?', [hash, req.user.id]);

    res.json({ success: true, message: 'Password updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;