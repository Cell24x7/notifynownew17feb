// routes/plans.js
const express = require('express');
const { z } = require('zod');
const { query } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

const planSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  price: z.number().min(0, "Price cannot be negative"),
  monthly_credits: z.number().min(0, "Monthly credits cannot be negative"),
  client_count: z.number().min(1, "Client count must be at least 1"),
  channels_allowed: z.array(z.string()).min(1, "At least one channel is required"),
  automation_limit: z.number().int(),
  campaign_limit: z.number().int(),
  api_access: z.boolean(),
});

// GET all plans
router.get('/', async (req, res) => {
  try {
    const isAdmin = req.query.admin === 'true';
    let sql = 'SELECT * FROM plans';
    const params = [];

    if (!isAdmin) {
      sql += ' WHERE status = ?';
      params.push('active');
    }

    sql += ' ORDER BY price ASC';

    const [plans] = await query(sql, params);

    const formatted = plans.map((p) => {
      let channelsAllowed = [];

      // Safe JSON parsing – never crash
      if (p.channels_allowed) {
        try {
          const parsed = JSON.parse(p.channels_allowed);
          channelsAllowed = Array.isArray(parsed) ? parsed : [];
        } catch (parseErr) {
          console.warn(`Invalid JSON in channels_allowed for plan ${p.id}:`, parseErr.message);
          channelsAllowed = [];
        }
      }

      return {
        id: p.id,
        name: p.name,
        price: Number(p.price),
        monthlyCredits: p.monthly_credits,
        clientCount: p.client_count,
        channelsAllowed,
        automationLimit: p.automation_limit,
        campaignLimit: p.campaign_limit,
        apiAccess: Boolean(p.api_access),
        status: p.status,
      };
    });

    res.json(formatted);
  } catch (err) {
    console.error('GET /api/plans ERROR:', err.message, err.stack);
    res.status(500).json({
      success: false,
      message: 'Cannot fetch plans',
      error: err.message,
    });
  }
});

// CREATE new plan
router.post('/', async (req, res) => {
  try {
    const data = planSchema.parse(req.body);
    const id = uuidv4();

    const [result] = await query(
      `
      INSERT INTO plans (
        id, name, price, monthly_credits, client_count,
        channels_allowed, automation_limit, campaign_limit, api_access
      ) VALUES (?,?,?,?,?,?,?,?,?)
    `,
      [
        id,
        data.name,
        data.price,
        data.monthly_credits,
        data.client_count,
        JSON.stringify(data.channels_allowed),
        data.automation_limit,
        data.campaign_limit,
        data.api_access ? 1 : 0,
      ]
    );

    res.status(201).json({
      success: true,
      id,
      ...data,
      status: 'active',
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: err.errors });
    }
    console.error('POST /api/plans ERROR:', err.message, err.stack);
    res.status(500).json({ success: false, message: 'Create failed', error: err.message });
  }
});

// UPDATE plan
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = planSchema.parse(req.body);

    const [result] = await query(
      `
      UPDATE plans SET
        name = ?, price = ?, monthly_credits = ?, client_count = ?,
        channels_allowed = ?, automation_limit = ?, campaign_limit = ?,
        api_access = ?
      WHERE id = ?
    `,
      [
        data.name,
        data.price,
        data.monthly_credits,
        data.client_count,
        JSON.stringify(data.channels_allowed),
        data.automation_limit,
        data.campaign_limit,
        data.api_access ? 1 : 0,
        id,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    res.json({ success: true, id, ...data });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: err.errors });
    }
    console.error('PUT /api/plans ERROR:', err.message, err.stack);
    res.status(500).json({ success: false, message: 'Update failed', error: err.message });
  }
});

// DELETE plan
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await query('DELETE FROM plans WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    res.json({ success: true, message: 'Plan deleted successfully' });
  } catch (err) {
    console.error('DELETE /api/plans ERROR:', err.message, err.stack);
    res.status(500).json({ success: false, message: 'Delete failed', error: err.message });
  }
});

// TOGGLE plan status
router.patch('/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await query('SELECT status FROM plans WHERE id = ?', [id]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    const currentStatus = rows[0].status;
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';

    await query('UPDATE plans SET status = ? WHERE id = ?', [newStatus, id]);

    res.json({ success: true, status: newStatus });
  } catch (err) {
    console.error('PATCH /api/plans/toggle ERROR:', err.message, err.stack);
    res.status(500).json({ success: false, message: 'Toggle failed', error: err.message });
  }
});

module.exports = router;