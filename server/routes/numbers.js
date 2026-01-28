// routes/numbers.js (Updated to use camelCase aliases in all queries for frontend compatibility)

const express = require('express');
const mysql = require('mysql2/promise');
const router = express.Router();

require('dotenv').config();

// Database connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// ────────────────────────────────────────────────
// USERS (for dropdowns in frontend)
// ────────────────────────────────────────────────
router.get('/users', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, name, email FROM users');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
});

// ────────────────────────────────────────────────
// VMNs
// ────────────────────────────────────────────────
router.get('/vmns', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        v.id,
        v.number,
        v.type,
        v.user_id AS userId,
        v.status,
        DATE(v.created_at) AS createdAt,
        COALESCE(u.name, 'Pool') AS userName
      FROM vmns v
      LEFT JOIN users u ON v.user_id = u.id
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch VMNs' });
  }
});

router.post('/vmns', async (req, res) => {
  const { number, type, userId, status } = req.body;

  if (!number || !type || !status) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  try {
    await pool.query(
      'INSERT INTO vmns (number, type, user_id, status, created_at) VALUES (?, ?, ?, ?, NOW())',
      [number, type, userId || null, status]
    );
    res.status(201).json({ success: true, message: 'VMN created' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to create VMN' });
  }
});

router.put('/vmns/:id', async (req, res) => {
  const { id } = req.params;
  const { number, type, userId, status } = req.body;

  try {
    const [result] = await pool.query(
      'UPDATE vmns SET number = ?, type = ?, user_id = ?, status = ? WHERE id = ?',
      [number, type, userId || null, status, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'VMN not found' });
    }
    res.json({ success: true, message: 'VMN updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update VMN' });
  }
});

router.delete('/vmns/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query('DELETE FROM vmns WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'VMN not found' });
    }
    res.json({ success: true, message: 'VMN deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to delete VMN' });
  }
});

// ────────────────────────────────────────────────
// MSISDNs
// ────────────────────────────────────────────────
router.get('/msisdns', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        m.id,
        m.msisdn,
        m.type,
        m.user_id AS userId,
        m.reason,
        DATE(m.created_at) AS createdAt,
        COALESCE(u.name, 'Global') AS userName
      FROM msisdns m
      LEFT JOIN users u ON m.user_id = u.id
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch MSISDNs' });
  }
});

router.post('/msisdns', async (req, res) => {
  const { msisdn, type, userId, reason } = req.body;

  if (!msisdn || !type || !reason) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  try {
    await pool.query(
      'INSERT INTO msisdns (msisdn, type, user_id, reason, created_at) VALUES (?, ?, ?, ?, NOW())',
      [msisdn, type, userId || null, reason]
    );
    res.status(201).json({ success: true, message: 'MSISDN created' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to create MSISDN' });
  }
});

router.post('/msisdns/bulk', async (req, res) => {
  const { msisdns } = req.body; // expect array of strings

  if (!Array.isArray(msisdns) || msisdns.length === 0) {
    return res.status(400).json({ success: false, message: 'No MSISDNs provided' });
  }

  try {
    const values = msisdns.map(ms => [ms, 'blocked', null, 'Bulk upload', new Date()]);
    await pool.query(
      'INSERT INTO msisdns (msisdn, type, user_id, reason, created_at) VALUES ?',
      [values]
    );
    res.status(201).json({ success: true, message: `Added ${msisdns.length} MSISDNs` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Bulk upload failed' });
  }
});

router.put('/msisdns/:id', async (req, res) => {
  const { id } = req.params;
  const { msisdn, type, userId, reason } = req.body;

  try {
    const [result] = await pool.query(
      'UPDATE msisdns SET msisdn = ?, type = ?, user_id = ?, reason = ? WHERE id = ?',
      [msisdn, type, userId || null, reason, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'MSISDN not found' });
    }
    res.json({ success: true, message: 'MSISDN updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update MSISDN' });
  }
});

router.delete('/msisdns/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query('DELETE FROM msisdns WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'MSISDN not found' });
    }
    res.json({ success: true, message: 'MSISDN deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to delete MSISDN' });
  }
});

// ────────────────────────────────────────────────
// Sender IDs
// ────────────────────────────────────────────────
router.get('/senders', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        s.id,
        s.sender_id AS senderId,
        s.type,
        s.user_id AS userId,
        s.status,
        DATE(s.created_at) AS createdAt,
        COALESCE(u.name, 'Shared') AS userName
      FROM senders s
      LEFT JOIN users u ON s.user_id = u.id
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch senders' });
  }
});

router.post('/senders', async (req, res) => {
  const { senderId, type, userId, status } = req.body;

  if (!senderId || !type || !status) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  try {
    await pool.query(
      'INSERT INTO senders (sender_id, type, user_id, status, created_at) VALUES (?, ?, ?, ?, NOW())',
      [senderId, type, userId || null, status]
    );
    res.status(201).json({ success: true, message: 'Sender created' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to create sender' });
  }
});

router.put('/senders/:id', async (req, res) => {
  const { id } = req.params;
  const { senderId, type, userId, status } = req.body;

  try {
    const [result] = await pool.query(
      'UPDATE senders SET sender_id = ?, type = ?, user_id = ?, status = ? WHERE id = ?',
      [senderId, type, userId || null, status, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Sender not found' });
    }
    res.json({ success: true, message: 'Sender updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update sender' });
  }
});

router.delete('/senders/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query('DELETE FROM senders WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Sender not found' });
    }
    res.json({ success: true, message: 'Sender deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to delete sender' });
  }
});

// ────────────────────────────────────────────────
// VMN Reports
// ────────────────────────────────────────────────
router.get('/vmn-reports', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        r.id,
        v.number AS vmn,
        r.received,
        DATE(r.date) AS date,
        COALESCE(u.name, 'Pool') AS user
      FROM vmn_reports r
      JOIN vmns v ON r.vmn_id = v.id
      LEFT JOIN users u ON v.user_id = u.id
      ORDER BY r.date DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch VMN reports' });
  }
});

module.exports = router;