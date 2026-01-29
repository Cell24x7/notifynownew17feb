const express = require('express');
const { z } = require('zod');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/db');

const router = express.Router();

// Vendor schema for validation
const vendorSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(['sms', 'whatsapp', 'rcs', 'email', 'voice', 'multi']),
  api_url: z.string().url("Invalid API URL"),
  api_key: z.string().optional(),
  priority: z.number().int().min(1).default(1),
  status: z.enum(['active', 'inactive']).default('active'),
  channels: z.array(z.string()).min(1, "At least one channel required"),
});

/// GET all vendors (safe version)
router.get('/', async (req, res) => {
  try {
    const [vendors] = await query(`
      SELECT 
        id, name, type, api_url, api_key,
        priority, status, channels,
        created_at, updated_at
      FROM vendors
      ORDER BY name ASC
    `);

    // Parse JSON safely
    const formatted = vendors.map((v) => {
      let channels = [];
      try {
        channels = v.channels ? JSON.parse(v.channels) : [];
      } catch (e) {
        console.warn(`Invalid channels JSON for vendor ${v.id}:`, v.channels);
        channels = [];
      }

      return {
        ...v,
        channels,                    // safe parsed channels
        api_key: v.api_key ? '***hidden***' : null, // hide api_key
      };
    });

    res.json({ success: true, vendors: formatted });
  } catch (err) {
    console.error('GET VENDORS ERROR:', err); // full error log
    res.status(500).json({ success: false, message: 'Failed to fetch vendors' });
  }
});


// ADD new vendor
router.post('/', async (req, res) => {
  try {
    const data = vendorSchema.parse(req.body);
    const id = uuidv4();

    await query(`
      INSERT INTO vendors (
        id, name, type, api_url, api_key,
        priority, status, channels
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      data.name,
      data.type,
      data.api_url,
      data.api_key || null,
      data.priority,
      data.status,
      JSON.stringify(data.channels),
    ]);

    res.status(201).json({ success: true, id });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: err.errors });
    }
    console.error('ADD VENDOR ERROR:', err.message);
    res.status(500).json({ success: false, message: 'Failed to add vendor' });
  }
});

// UPDATE vendor
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = vendorSchema.parse(req.body);

    const [result] = await query(`
      UPDATE vendors SET
        name = ?, type = ?, api_url = ?, api_key = ?,
        priority = ?, status = ?, channels = ?
      WHERE id = ?
    `, [
      data.name,
      data.type,
      data.api_url,
      data.api_key || null,
      data.priority,
      data.status,
      JSON.stringify(data.channels),
      id,
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    res.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: err.errors });
    }
    console.error('UPDATE VENDOR ERROR:', err.message);
    res.status(500).json({ success: false, message: 'Failed to update vendor' });
  }
});

// DELETE vendor
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await query('DELETE FROM vendors WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    // Also delete associated mappings
    await query('DELETE FROM vendor_user_mappings WHERE vendor_id = ?', [id]);

    res.json({ success: true });
  } catch (err) {
    console.error('DELETE VENDOR ERROR:', err.message);
    res.status(500).json({ success: false, message: 'Failed to delete vendor' });
  }
});

// GET all vendor-user mappings
router.get('/mappings', async (req, res) => {
  try {
    const [mappings] = await query(`
      SELECT 
        id, vendor_id, user_id, priority, created_at
      FROM vendor_user_mappings
      ORDER BY created_at DESC
    `);

    res.json({ success: true, mappings });
  } catch (err) {
    console.error('GET MAPPINGS ERROR:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch mappings' });
  }
});

// SAVE/UPDATE vendor-user mappings (replace all for a vendor)
router.post('/mappings', async (req, res) => {
  try {
    const { vendor_id, user_ids } = req.body;

    if (!vendor_id || !Array.isArray(user_ids)) {
      return res.status(400).json({ success: false, message: 'Invalid request data' });
    }

    // Delete existing mappings for this vendor
    await query('DELETE FROM vendor_user_mappings WHERE vendor_id = ?', [vendor_id]);

    // Add new mappings
    if (user_ids.length > 0) {
      const values = user_ids.map(user_id => [uuidv4(), vendor_id, user_id, 1]);
      await query(`
        INSERT INTO vendor_user_mappings (
          id, vendor_id, user_id, priority
        ) VALUES ?
      `, [values]);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('SAVE MAPPINGS ERROR:', err.message);
    res.status(500).json({ success: false, message: 'Failed to save mappings' });
  }
});

module.exports = router;