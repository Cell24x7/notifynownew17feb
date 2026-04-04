const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

require('dotenv').config(); // ← Yeh line zaruri hai .env load karne ke liye

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
const authenticateToken = require('../middleware/authMiddleware');

const compressPermissions = (perms) => {
  if (!Array.isArray(perms)) return [];
  return perms.map(p => {
    if (typeof p === 'string') return p;
    if (p && typeof p === 'object' && p.feature) {
      const isAdmin = p.admin === true || p.admin === 1 || p.admin === 'true' || p.admin === '1';
      const isManager = p.manager === true || p.manager === 1 || p.manager === 'true' || p.manager === '1';
      const isAgent = p.agent === true || p.agent === 1 || p.agent === 'true' || p.agent === '1';
      if (isAdmin || isManager || isAgent) return p.feature;
    }
    return null;
  }).filter(Boolean);
};

const isResellerOrAdmin = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin' && req.user.role !== 'reseller') {
    return res.status(403).json({ success: false, message: 'Unauthorized. Admin or Reseller access required.' });
  }
  next();
};

if (!JWT_SECRET) {
  console.error('CRITICAL: JWT_SECRET is missing in .env file! Impersonate will fail.');
}

// GET all clients (Admin or Reseller filtered)
router.get('/', authenticateToken, isResellerOrAdmin, async (req, res) => {
  try {
    let sql = `
      SELECT
        id, name, email, company AS company_name, contact_phone,
        plan_id, credits_available, wallet_balance, credits_used,
        IFNULL(channels_enabled, '[]') AS channels_enabled,
        status, created_at, permissions, rcs_config_id, whatsapp_config_id,
        rcs_text_price, rcs_rich_card_price, rcs_carousel_price,
        wa_marketing_price, wa_utility_price, wa_authentication_price,
        sms_promotional_price, sms_transactional_price, sms_service_price,
        reseller_id, is_read, is_social_signup
      FROM users
      WHERE role IN ('client', 'user')
    `;
    let params = [];

    if (req.user.role === 'reseller') {
      sql += ' AND reseller_id = ?';
      params.push(req.user.actual_reseller_id);
    }

    sql += ' ORDER BY id DESC';

    const [rows] = await query(sql, params);

    // Parse permissions if they are strings
    const clients = rows.map(client => ({
      ...client,
      permissions: typeof client.permissions === 'string' ? JSON.parse(client.permissions) : client.permissions
    }));

    res.json({ success: true, clients });
  } catch (err) {
    console.error('GET CLIENTS ERROR:', err.message);
    res.status(500).json({ success: false });
  }
});

// ADD client (Admin or Reseller)
router.post('/', authenticateToken, isResellerOrAdmin, async (req, res) => {
  const {
    name = '', company_name = '', contact_phone = '',
    email, password, plan_id = '', status = 'active',
    credits_available = 0, channels_enabled = [],
    rcs_text_price = 0.10, rcs_rich_card_price = 0.15, rcs_carousel_price = 0.20,
    wa_marketing_price = 0.80, wa_utility_price = 0.40, wa_authentication_price = 0.30,
    sms_promotional_price = 1.00, sms_transactional_price = 1.00, sms_service_price = 1.00
  } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email & password required' });
  }

  try {
    // --- Reseller Credit Check (Multi-tier Security) ---
    if (req.user.role === 'reseller' && credits_available > 0) {
      const [reseller] = await query('SELECT wallet_balance FROM users WHERE id = ?', [req.user.id]);
      if (!reseller.length || parseFloat(reseller[0].wallet_balance) < parseFloat(credits_available)) {
        return res.status(400).json({ 
          success: false, 
          message: `Insufficient credits in your pool (Available: ${reseller[0]?.wallet_balance || 0})` 
        });
      }
      
      // Deduct from Reseller
      await query('UPDATE users SET wallet_balance = wallet_balance - ?, credits_available = credits_available - ?, credits_used = credits_used + ? WHERE id = ?', 
        [credits_available, credits_available, credits_available, req.user.id]);
      
      // Log Reseller Transaction
      await query(`
        INSERT INTO transactions (user_id, type, amount, credits, description, status)
        VALUES (?, 'debit', ?, ?, ?, 'completed')
      `, [req.user.id, credits_available, credits_available, `Allocated to client: ${email}`]);
    }

    const [exists] = await query('SELECT id FROM users WHERE email = ?', [email]);
    if (exists.length) return res.status(409).json({ success: false, message: 'Email already exists' });

    const hash = await bcrypt.hash(password, 10);

    const [result] = await query(`
      INSERT INTO users (
        name, company, contact_phone, email, password, role,
        status, plan_id, credits_available, wallet_balance, credits_used, channels_enabled, rcs_config_id, whatsapp_config_id,
        rcs_text_price, rcs_rich_card_price, rcs_carousel_price,
        wa_marketing_price, wa_utility_price, wa_authentication_price,
        sms_promotional_price, sms_transactional_price, sms_service_price,
        reseller_id
      ) VALUES (?, ?, ?, ?, ?, 'user', ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      name, company_name, contact_phone, email, hash,
      status, plan_id, credits_available, credits_available, JSON.stringify(channels_enabled), req.body.rcs_config_id || null, req.body.whatsapp_config_id || null,
      rcs_text_price, rcs_rich_card_price, rcs_carousel_price,
      wa_marketing_price, wa_utility_price, wa_authentication_price,
      sms_promotional_price, sms_transactional_price, sms_service_price,
      req.user.role === 'reseller' ? req.user.actual_reseller_id : (req.body.reseller_id || null)
    ]);

    // Log Initial Transaction
    if (credits_available > 0) {
      await query(`
        INSERT INTO transactions (user_id, type, amount, credits, description, status)
        VALUES (?, 'credit', ?, ?, 'Initial Credits', 'completed')
      `, [result.insertId, credits_available, credits_available]);
    }

    res.status(201).json({ success: true, id: result.insertId });
  } catch (err) {
    console.error('ADD CLIENT ERROR:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// UPDATE client (Admin only)
router.put('/:id', authenticateToken, isResellerOrAdmin, async (req, res) => {
  const clientId = req.params.id;
  const {
    name, company_name, contact_phone, email, password,
    plan_id, status, credits_available, channels_enabled, permissions, rcs_config_id, whatsapp_config_id,
    rcs_text_price, rcs_rich_card_price, rcs_carousel_price,
    wa_marketing_price, wa_utility_price, wa_authentication_price,
    sms_promotional_price, sms_transactional_price, sms_service_price
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
  if (permissions !== undefined) { fields.push('permissions = ?'); values.push(JSON.stringify(permissions)); }
  if (rcs_config_id !== undefined) { fields.push('rcs_config_id = ?'); values.push(rcs_config_id); }
  if (whatsapp_config_id !== undefined) { fields.push('whatsapp_config_id = ?'); values.push(whatsapp_config_id); }
  if (rcs_text_price !== undefined) { fields.push('rcs_text_price = ?'); values.push(rcs_text_price); }
  if (rcs_rich_card_price !== undefined) { fields.push('rcs_rich_card_price = ?'); values.push(rcs_rich_card_price); }
  if (rcs_carousel_price !== undefined) { fields.push('rcs_carousel_price = ?'); values.push(rcs_carousel_price); }
  if (wa_marketing_price !== undefined) { fields.push('wa_marketing_price = ?'); values.push(wa_marketing_price); }
  if (wa_utility_price !== undefined) { fields.push('wa_utility_price = ?'); values.push(wa_utility_price); }
  if (wa_authentication_price !== undefined) { fields.push('wa_authentication_price = ?'); values.push(wa_authentication_price); }
  if (sms_promotional_price !== undefined) { fields.push('sms_promotional_price = ?'); values.push(sms_promotional_price); }
  if (sms_transactional_price !== undefined) { fields.push('sms_transactional_price = ?'); values.push(sms_transactional_price); }
  if (sms_service_price !== undefined) { fields.push('sms_service_price = ?'); values.push(sms_service_price); }

  if (credits_available !== undefined) {
    fields.push('wallet_balance = ?');
    values.push(credits_available);
  }

  if (password && password.trim()) {
    const hash = await bcrypt.hash(password, 10);
    fields.push('password = ?');
    values.push(hash);
  }

  if (!fields.length) {
    return res.status(400).json({ success: false, message: 'No fields to update' });
  }

  try {
    // If credits_available is being updated, we should log a transaction
    if (credits_available !== undefined) {
      const [oldUser] = await query('SELECT credits_available FROM users WHERE id = ?', [clientId]);
      const diff = parseFloat(credits_available) - parseFloat(oldUser[0]?.credits_available || 0);

      if (diff !== 0) {
        // --- START Multi-tier Reseller Check ---
        if (req.user.role === 'reseller') {
          if (diff > 0) {
            // Need to deduct from reseller
            const [reseller] = await query('SELECT wallet_balance FROM users WHERE id = ?', [req.user.id]);
            if (!reseller.length || parseFloat(reseller[0].wallet_balance) < diff) {
              return res.status(400).json({ success: false, message: `Insufficient credits in your pool to add ${diff} more.` });
            }
            await query('UPDATE users SET wallet_balance = wallet_balance - ?, credits_available = credits_available - ?, credits_used = credits_used + ? WHERE id = ?', 
              [diff, diff, diff, req.user.id]);
          } else {
            // Refund to reseller (diff is negative)
            const refundAmount = Math.abs(diff);
            await query('UPDATE users SET wallet_balance = wallet_balance + ?, credits_available = credits_available + ?, credits_used = credits_used - ? WHERE id = ?', 
              [refundAmount, refundAmount, refundAmount, req.user.id]);
          }

          // Log Reseller Side Transaction
          await query(`
            INSERT INTO transactions (user_id, type, amount, credits, description, status)
            VALUES (?, ?, ?, ?, ?, 'completed')
          `, [req.user.id, diff > 0 ? 'debit' : 'credit', Math.abs(diff), Math.abs(diff), `Adjustment for client ID ${clientId}`]);
        }
        // --- END Multi-tier Reseller Check ---

        await query(`
          INSERT INTO transactions (user_id, type, amount, credits, description, status)
          VALUES (?, ?, ?, ?, 'Admin Adjustment', 'completed')
        `, [clientId, diff > 0 ? 'credit' : 'debit', Math.abs(diff), Math.abs(diff)]);
      }
    }

    let sql = `UPDATE users SET ${fields.join(', ')} WHERE id = ? AND role IN ('client', 'user')`;
    values.push(clientId);

    if (req.user.role === 'reseller') {
      sql += ' AND reseller_id = ?';
      values.push(req.user.actual_reseller_id);
    }

    const [result] = await query(sql, values);

    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Client not found' });

    res.json({ success: true });
  } catch (err) {
    console.error('UPDATE CLIENT ERROR:', err.message);
    res.status(500).json({ success: false });
  }
});

// DELETE client (Admin only)
router.delete('/:id', authenticateToken, isResellerOrAdmin, async (req, res) => {
  const clientId = req.params.id;

  try {
    let sql = 'DELETE FROM users WHERE id = ? AND role IN ("client", "user")';
    let params = [clientId];

    if (req.user.role === 'reseller') {
      sql += ' AND reseller_id = ?';
      params.push(req.user.actual_reseller_id);
    }

    const [result] = await query(sql, params);

    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Client not found' });

    res.json({ success: true, message: 'Client deleted successfully' });
  } catch (err) {
    console.error('DELETE CLIENT ERROR:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// IMPERSONATE client – Yeh final safe version hai
// IMPERSONATE client – Yeh final safe version hai (Admin only)
router.post('/:id/impersonate', authenticateToken, isResellerOrAdmin, async (req, res) => {
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
    // Updated query to fetch permissions and plan permissions
    let sql = `
      SELECT u.id, u.name, u.email, u.company, u.role, u.channels_enabled, u.permissions,
             u.rcs_text_price, u.rcs_rich_card_price, u.rcs_carousel_price,
             u.wa_marketing_price, u.wa_utility_price, u.wa_authentication_price,
             u.sms_promotional_price, u.sms_transactional_price, u.sms_service_price,
             u.whatsapp_config_id, u.rcs_config_id,
             p.permissions as plan_permissions, u.reseller_id
      FROM users u
      LEFT JOIN plans p ON u.plan_id = p.id
      WHERE u.id = ? AND u.role IN ("client", "user")
    `;
    let params = [clientId];

    if (req.user.role === 'reseller') {
      sql += ' AND u.reseller_id = ?';
      params.push(req.user.actual_reseller_id);
    }

    const [rows] = await query(sql, params);

    console.log('[IMPERSONATE] Query returned rows count:', rows.length);
    if (rows.length === 0) {
      console.log('[IMPERSONATE] Client not found');
      return res.status(404).json({ success: false, message: 'Client not found or not a user' });
    }

    const client = rows[0];
    console.log('[IMPERSONATE] Client data found:', client.email);

    // Robust Permission Resolution (Consistent with auth.js)
    let finalPermissions = null;
    if (client.permissions !== null && client.permissions !== undefined) {
      try {
        finalPermissions = typeof client.permissions === 'string' ? JSON.parse(client.permissions) : client.permissions;
      } catch (e) {}
    }
    
    // Fallback to plan
    if (finalPermissions === null && client.plan_permissions) {
      try {
        finalPermissions = typeof client.plan_permissions === 'string' ? JSON.parse(client.plan_permissions) : client.plan_permissions;
      } catch (e) {}
    }
    
    // Final fallback to empty if still null
    if (finalPermissions === null) {
      // Users/Clients default to empty if no plan/override exists, to be safe.
      finalPermissions = [];
    }

    // Parse channels if string
    const channelsEnabled = client.channels_enabled
      ? (typeof client.channels_enabled === 'string' ? JSON.parse(client.channels_enabled) : client.channels_enabled)
      : [];

    // Safe payload with defaults
    const payload = {
      id: client.id,
      email: client.email || 'unknown@email.com',
      name: client.name || 'Unknown User',
      company: client.company || null,
      role: client.role || 'user',
      impersonatedBy: 'superadmin',
      originalRole: 'user',
      permissions: compressPermissions(finalPermissions), // Added
      channels_enabled: channelsEnabled, // Added
      rcs_config_id: client.rcs_config_id,
      whatsapp_config_id: client.whatsapp_config_id,
      rcs_text_price: client.rcs_text_price,
      rcs_rich_card_price: client.rcs_rich_card_price,
      rcs_carousel_price: client.rcs_carousel_price,
      wa_marketing_price: client.wa_marketing_price,
      wa_utility_price: client.wa_utility_price,
      wa_authentication_price: client.wa_authentication_price,
      sms_promotional_price: client.sms_promotional_price,
      sms_transactional_price: client.sms_transactional_price,
      sms_service_price: client.sms_service_price,
      iat: Math.floor(Date.now() / 1000)
    };

    console.log('[IMPERSONATE] Signing JWT token with permissions count:', finalPermissions.length);
    const impersonateToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

    console.log('[IMPERSONATE] Token generated successfully');

    res.json({
      success: true,
      token: impersonateToken,
      redirectTo: '/dashboard'
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
/**
 * Mark Enquiry as Read
 */
router.post('/:id/read', authenticateToken, isResellerOrAdmin, async (req, res) => {
  const clientId = req.params.id;
  try {
    let sql = "UPDATE users SET is_read = 1 WHERE id = ?";
    let params = [clientId];

    if (req.user.role === 'reseller') {
      sql += " AND reseller_id = ?";
      params.push(req.user.actual_reseller_id);
    }

    await query(sql, params);
    res.json({ success: true, message: 'Enquiry marked as read' });
  } catch (err) {
    console.error('MARK READ ERROR:', err.message);
    res.status(500).json({ success: false });
  }
});

module.exports = router;