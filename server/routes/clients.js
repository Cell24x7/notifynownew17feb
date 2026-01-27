const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

require('dotenv').config(); // ← Yeh line zaruri hai .env load karne ke liye

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('CRITICAL: JWT_SECRET is missing in .env file! Impersonate will fail.');
}

// GET all clients
router.get('/', async (req, res) => {
  try {
    const [rows] = await query(`
      SELECT
        id, name, email, company AS company_name, contact_phone,
        plan_id, credits_available, credits_used,
        IFNULL(channels_enabled, '[]') AS channels_enabled,
        status, created_at
      FROM users
      WHERE role = 'user'
      ORDER BY id DESC
    `);

    res.json({ success: true, clients: rows });
  } catch (err) {
    console.error('GET CLIENTS ERROR:', err.message);
    res.status(500).json({ success: false });
  }
});

// ADD client (baaki code same – no change needed)
router.post('/', async (req, res) => {
  const {
    name = '', company_name = '', contact_phone = '',
    email, password, plan_id = '', status = 'active',
    credits_available = 0, channels_enabled = []
  } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email & password required' });
  }

  try {
    const [exists] = await query('SELECT id FROM users WHERE email = ?', [email]);
    if (exists.length) return res.status(409).json({ success: false, message: 'Email already exists' });

    const hash = await bcrypt.hash(password, 10);

    const [result] = await query(`
      INSERT INTO users (
        name, company, contact_phone, email, password, role,
        status, plan_id, credits_available, credits_used, channels_enabled
      ) VALUES (?, ?, ?, ?, ?, 'user', ?, ?, ?, 0, ?)
    `, [
      name, company_name, contact_phone, email, hash,
      status, plan_id, credits_available, JSON.stringify(channels_enabled)
    ]);

    res.status(201).json({ success: true, id: result.insertId });
  } catch (err) {
    console.error('ADD CLIENT ERROR:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// UPDATE client (baaki same)
router.put('/:id', async (req, res) => {
  const clientId = req.params.id;
  const {
    name, company_name, contact_phone, email, password,
    plan_id, status, credits_available, channels_enabled
  } = req.body;

  const fields = [];
  const values = [];

  if (name !== undefined) { fields.push('name = ?'); values.push(name); }
  if (company_name !== undefined) { fields.push('company = ?'); values.push(company_name); }
  if (contact_phone !== undefined) { fields.push('contact_phone = ?'); values.push(contact_phone); }
  if (email !== undefined) { fields.push('email = ?'); values.push(email); }
  if (plan_id !== undefined) { fields.push('plan_id = ?'); values.push(plan_id); }
  if (status !== undefined) { fields.push('status = ?'); values.push(status); }
  if (credits_available !== undefined) { fields.push('credits_available = ?'); values.push(credits_available); }
  if (channels_enabled !== undefined) { fields.push('channels_enabled = ?'); values.push(JSON.stringify(channels_enabled)); }
  if (password && password.trim()) {
    const hash = await bcrypt.hash(password, 10);
    fields.push('password = ?');
    values.push(hash);
  }

  if (!fields.length) {
    return res.status(400).json({ success: false, message: 'No fields to update' });
  }

  try {
    const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = ? AND role = "user"`;
    values.push(clientId);

    const [result] = await query(sql, values);

    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Client not found' });

    res.json({ success: true });
  } catch (err) {
    console.error('UPDATE CLIENT ERROR:', err.message);
    res.status(500).json({ success: false });
  }
});

// DELETE client (same)
router.delete('/:id', async (req, res) => {
  const clientId = req.params.id;

  try {
    const [result] = await query(
      'DELETE FROM users WHERE id = ? AND role = "user"',
      [clientId]
    );

    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Client not found' });

    res.json({ success: true, message: 'Client deleted successfully' });
  } catch (err) {
    console.error('DELETE CLIENT ERROR:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// IMPERSONATE client – Yeh final safe version hai
router.post('/:id/impersonate', async (req, res) => {
  const clientId = req.params.id;
  console.log(`[IMPERSONATE START] Requested for client ID: ${clientId}`);

  try {
    // Secret check
    if (!process.env.JWT_SECRET) {
      console.error('[IMPERSONATE] JWT_SECRET missing in .env file!');
      return res.status(500).json({
        success: false,
        message: 'Server configuration error: Missing JWT secret'
      });
    }

    console.log('[IMPERSONATE] Querying database...');
    const [rows] = await query(
      'SELECT id, name, email, company, role FROM users WHERE id = ? AND role = "user"',
      [clientId]
    );

    console.log('[IMPERSONATE] Query returned rows count:', rows.length);
    if (rows.length === 0) {
      console.log('[IMPERSONATE] Client not found');
      return res.status(404).json({ success: false, message: 'Client not found or not a user' });
    }

    const client = rows[0];
    console.log('[IMPERSONATE] Client data found:', client);

    // Safe payload with defaults
    const payload = {
      id: client.id,
      email: client.email || 'unknown@email.com',
      name: client.name || 'Unknown User',
      company: client.company || null,
      role: client.role || 'user',
      impersonatedBy: 'superadmin',
      originalRole: 'user',
      iat: Math.floor(Date.now() / 1000)
    };

    console.log('[IMPERSONATE] Signing JWT token...');
    const impersonateToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

    console.log('[IMPERSONATE] Token generated successfully');

    res.json({
      success: true,
      token: impersonateToken,
      redirectTo: '/dashboard'  // change kar sakte ho agar dashboard route alag hai
    });
  } catch (err) {
    console.error('[IMPERSONATE CRASH FULL DETAILS]', {
      message: err.message,
      stack: err.stack || 'No stack trace available',
      clientId,
      jwtSecretExists: !!process.env.JWT_SECRET
    });

    res.status(500).json({
      success: false,
      message: 'Failed to impersonate client',
      error: err.message || 'Internal server error'
    });
  }
});

module.exports = router;