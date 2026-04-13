// routes/profile.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

const router = express.Router();


const authenticate = require('../middleware/authMiddleware');
const { sendAdminNotification } = require('../utils/emailService');

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('⚠️ WARNING: JWT_SECRET missing in profile routes! Auth will fail.');
}

// GET /api/profile
router.get('/', authenticate, async (req, res) => {
  try {
    const [rows] = await query(
      `SELECT u.id, u.name, u.email, u.company, u.contact_phone, u.plan_id, 
              u.credits_available, u.wallet_balance, u.credits_used, u.status, u.created_at, u.role, u.channels_enabled,
              u.permissions, u.rcs_text_price, u.rcs_rich_card_price, u.rcs_carousel_price, u.sms_transactional_price, u.sms_promotional_price, u.sms_service_price, u.rcs_config_id, u.whatsapp_config_id, u.pe_id, u.hash_id, p.permissions as plan_permissions,
              COALESCE(r.id, u.reseller_id) as actual_reseller_id
       FROM users u
       LEFT JOIN plans p ON u.plan_id = p.id
       LEFT JOIN resellers r ON u.email = r.email AND u.role = 'reseller'
       WHERE u.id = ?`,
      [req.user.id]
    );

    if (!rows.length) return res.status(404).json({ success: false });

    const user = rows[0];

    // Standardized compression logic (same as auth.js)
    const compressPermissions = (perms) => {
      if (!Array.isArray(perms)) return [];
      return perms.map(p => {
        if (typeof p === 'string') return p;
        if (p && typeof p === 'object' && p.feature && (p.admin || p.manager || p.agent || p.admin === 1)) return p.feature;
        return null;
      }).filter(Boolean);
    };

    // Robust Fallback Logic (User > Plan > Role Defaults)
    let finalPermissions = null;
    if (user.permissions !== null && user.permissions !== undefined) {
      try {
        const parsed = typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions;
        if (Array.isArray(parsed)) finalPermissions = parsed;
      } catch (e) {}
    }

    if (finalPermissions === null && user.plan_permissions) {
      try {
        const parsed = typeof user.plan_permissions === 'string' ? JSON.parse(user.plan_permissions) : user.plan_permissions;
        if (Array.isArray(parsed)) finalPermissions = parsed;
      } catch (e) {}
    }

    if (finalPermissions === null) {
      // // console.log(`[PROFILE] No permissions for user ${user.email}, applying defaults for: ${user.role}`);
      if (user.role === 'reseller') {
        finalPermissions = [
          { feature: 'Dashboard - View', admin: 1, manager: 1, agent: 1 },
          { feature: 'Campaigns - View', admin: 1, manager: 1, agent: 1 },
          { feature: 'WhatsApp - View', admin: 1, manager: 1, agent: 1 },
          { feature: 'RCS - View', admin: 1, manager: 1, agent: 1 },
          { feature: 'SMS - View', admin: 1, manager: 1, agent: 1 },
          { feature: 'Reports - View', admin: 1, manager: 1, agent: 1 },
          { feature: 'Chat - View', admin: 1, manager: 1, agent: 1 },
          { feature: 'Contacts - View', admin: 1, manager: 1, agent: 1 },
          { feature: 'DLT Templates - View', admin: 1, manager: 1, agent: 1 },
          { feature: 'Automations - View', admin: 1, manager: 1, agent: 1 },
          { feature: 'Chatflows - View', admin: 1, manager: 1, agent: 1 },
          { feature: 'Integrations - View', admin: 1, manager: 1, agent: 1 },
          { feature: 'Reseller Users - View', admin: 1, manager: 1, agent: 1 },
          { feature: 'Reseller Branding - View', admin: 1, manager: 1, agent: 1 },
          { feature: 'Marketplace - View', admin: 1, manager: 1, agent: 1 },
          { feature: 'Wallet - View', admin: 1, manager: 1, agent: 1 },
          { feature: 'Settings - View', admin: 1, manager: 1, agent: 1 }
        ];
      } else {
        finalPermissions = [];
      }
    } else {
      // // console.log(`[PROFILE] Using explicit permissions for user ${user.email} (Count: ${finalPermissions.length})`);
    }

    const compressed = compressPermissions(finalPermissions);
    // // console.log(`[PROFILE] Final compressed permissions for ${user.email}: ${JSON.stringify(compressed)}`);

    const userWithPermissions = {
      ...user,
      permissions: compressPermissions(finalPermissions),
      plan_permissions: undefined
    };

    return res.json({ success: true, user: userWithPermissions });
  } catch (err) {
    console.error('Profile Error:', err);
    if (!res.headersSent) {
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  }
});

// GET /api/profile/team
router.get('/team', authenticate, async (req, res) => {
  try {
    const [rows] = await query(
      `SELECT id, name, email, role, department, status, created_at 
       FROM users`
    );
    return res.json({ success: true, users: rows });
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
  if (req.body.channels_config) {
    updates.push('channels_config = ?');
    values.push(JSON.stringify(req.body.channels_config));
  }
  if (req.body.pe_id !== undefined) {
    updates.push('pe_id = ?');
    values.push(req.body.pe_id ? req.body.pe_id.trim() : null);
  }
  if (req.body.hash_id !== undefined) {
    updates.push('hash_id = ?');
    values.push(req.body.hash_id ? req.body.hash_id.trim() : null);
  }

  if (!updates.length) {
    return res.status(400).json({ success: false, message: 'No changes provided' });
  }

  try {
    values.push(req.user.id);
    await query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);

    // Return updated user
    const [updated] = await query(
      `SELECT id, name, email, company, contact_phone, plan_id, credits_available, wallet_balance, channels_enabled, sms_transactional_price, sms_promotional_price, sms_service_price, pe_id, hash_id 
       FROM users WHERE id = ?`,
      [req.user.id]
    );

    // Notify Admins
    try {
      await sendAdminNotification(updated[0], 'PROFILE_UPDATE');
    } catch (emailErr) {
      console.error('Failed to send admin notification:', emailErr);
    }

    return res.json({ success: true, user: updated[0] });
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

    return res.json({ success: true, message: 'Password updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/profile/change-email
router.put('/change-email', authenticate, async (req, res) => {
  const { newEmail } = req.body;

  if (!newEmail || !newEmail.trim()) {
    return res.status(400).json({ success: false, message: 'New email required' });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(newEmail)) {
    return res.status(400).json({ success: false, message: 'Invalid email format' });
  }

  try {
    // Check if email already exists
    const [existing] = await query('SELECT id FROM users WHERE email = ? AND id != ?', [newEmail, req.user.id]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Email already in use' });
    }

    // Update email
    await query('UPDATE users SET email = ? WHERE id = ?', [newEmail, req.user.id]);

    // Generate new token with updated email
    const [updated] = await query('SELECT id, name, email, role, company, channels_enabled, sms_transactional_price, sms_promotional_price, sms_service_price FROM users WHERE id = ?', [req.user.id]);
    const token = jwt.sign(
      {
        id: updated[0].id,
        email: updated[0].email,
        role: updated[0].role,
        name: updated[0].name,
        company: updated[0].company,
        channels_enabled: updated[0].channels_enabled
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.json({
      success: true,
      message: 'Email updated successfully',
      token,
      user: updated[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/profile/api-password
router.put('/api-password', authenticate, async (req, res) => {
  const { apiPassword } = req.body;

  if (!apiPassword || !apiPassword.trim()) {
    return res.status(400).json({ success: false, message: 'API Password cannot be empty' });
  }

  try {
    // Generate hashed API password or save it plain. We are saving it plain here 
    // for simple token-like validation, or we can hash it. 
    // The user requested to use it for API, so hashing is standard.
    const hash = await bcrypt.hash(apiPassword, 10);
    await query('UPDATE users SET api_password = ? WHERE id = ?', [hash, req.user.id]);

    return res.json({ success: true, message: 'API Password updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
