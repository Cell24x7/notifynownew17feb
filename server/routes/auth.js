const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('JWT_SECRET missing in .env file! Server cannot start.');
  process.exit(1); 
}

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ success: false });

  try {
    const [rows] = await query('SELECT * FROM users WHERE email = ?', [email]);
    if (!rows.length) return res.status(401).json({ success: false });

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ success: false });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({
      success: true,
      token,
      user,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        company: user.company,
        role: user.role
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

router.post('/signup', async (req, res) => {
  const { name, company, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ success: false });

  try {
    const hash = await bcrypt.hash(password, 10);
    const [result] = await query(
      'INSERT INTO users (name, email, password, company, role) VALUES (?, ?, ?, ?, "user")',
      [name, email, hash, company || null]
    );

    const token = jwt.sign(
      { id: result.insertId, email, role: 'user' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(201).json({
      success: true,
      token,
      user: { id: result.insertId, name, email, company, role: 'user' }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});


// Middleware
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// Get current user (channels_enabled, credits, etc.)
router.get('/me', authenticate, async (req, res) => {
  try {
    const [rows] = await query('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (!rows.length) return res.status(404).json({ success: false });
    res.json({ success: true, user: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

// Update channels_enabled
router.put('/channels', authenticate, async (req, res) => {
  const { channels } = req.body;
  if (!Array.isArray(channels)) return res.status(400).json({ success: false });
  try {
    await query('UPDATE users SET channels_enabled = ? WHERE id = ?', [JSON.stringify(channels), req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

// Get all users (admin only)
router.get('/users', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Unauthorized' });
  try {
    const [rows] = await query('SELECT id, name, email, role, status FROM users');
    res.json({ success: true, users: rows });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

module.exports = router;