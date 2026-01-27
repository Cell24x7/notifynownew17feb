const express = require('express');
const { query } = require('../config/db');

const router = express.Router();

// GET all resellers
router.get('/', async (req, res) => {
  try {
    const [rows] = await query(`
      SELECT 
        id, name, email, phone, domain, api_base_url,
        commission_percent, status, revenue_generated,
        clients_managed, payout_pending, created_at
      FROM resellers
      ORDER BY created_at DESC
    `);

    res.json({ success: true, resellers: rows });
  } catch (err) {
    console.error('GET RESELLERS ERROR:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch resellers' });
  }
});

// ADD reseller
router.post('/', async (req, res) => {
  const {
    name, email, phone = null, domain = null, api_base_url = null,
    commission_percent = 10, status = 'active'
  } = req.body;

  if (!name || !email) {
    return res.status(400).json({ success: false, message: 'Name and email are required' });
  }

  try {
    const [exists] = await query('SELECT id FROM resellers WHERE email = ?', [email]);
    if (exists.length) return res.status(409).json({ success: false, message: 'Email already registered' });

    const [result] = await query(`
      INSERT INTO resellers (
        name, email, phone, domain, api_base_url, 
        commission_percent, status, 
        revenue_generated, clients_managed, payout_pending
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 0)
    `, [
      name, email, phone, domain, api_base_url,
      commission_percent, status
    ]);

    res.status(201).json({
      success: true,
      id: result.insertId,
      message: 'Reseller added successfully'
    });
  } catch (err) {
    console.error('ADD RESELLER ERROR:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// UPDATE reseller
router.put('/:id', async (req, res) => {
  const resellerId = req.params.id;
  const {
    name, email, phone, domain, api_base_url,
    commission_percent, status
  } = req.body;

  const fields = [];
  const values = [];

  if (name !== undefined) { fields.push('name = ?'); values.push(name); }
  if (email !== undefined) { fields.push('email = ?'); values.push(email); }
  if (phone !== undefined) { fields.push('phone = ?'); values.push(phone); }
  if (domain !== undefined) { fields.push('domain = ?'); values.push(domain); }
  if (api_base_url !== undefined) { fields.push('api_base_url = ?'); values.push(api_base_url); }
  if (commission_percent !== undefined) { fields.push('commission_percent = ?'); values.push(commission_percent); }
  if (status !== undefined) { fields.push('status = ?'); values.push(status); }

  if (!fields.length) {
    return res.status(400).json({ success: false, message: 'No fields to update' });
  }

  try {
    const sql = `UPDATE resellers SET ${fields.join(', ')} WHERE id = ?`;
    values.push(resellerId);

    const [result] = await query(sql, values);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Reseller not found' });
    }

    res.json({ success: true, message: 'Reseller updated' });
  } catch (err) {
    console.error('UPDATE RESELLER ERROR:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;