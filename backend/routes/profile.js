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
  console.error('JWT_SECRET missing in profile routes!');
  process.exit(1);
}

// GET /api/profile
router.get('/', authenticate, async (req, res) => {
  try {
    const [rows] = await query(
      `SELECT u.id, u.name, u.email, u.company, u.contact_phone, u.plan_id, 
              u.credits_available, u.credits_used, u.status, u.created_at, u.role, u.channels_enabled,
              u.permissions, p.permissions as plan_permissions
       FROM users u
       LEFT JOIN plans p ON u.plan_id = p.id
       WHERE u.id = ?`,
      [req.user.id]
    );

    if (!rows.length) return res.status(404).json({ success: false });

    const user = rows[0];

    // Logic: User-specific permissions override Plan permissions
    let finalPermissions = [];
    if (user.permissions) {
      finalPermissions = typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions;
    } else if (user.plan_permissions) {
      finalPermissions = typeof user.plan_permissions === 'string' ? JSON.parse(user.plan_permissions) : user.plan_permissions;
    }

    const userWithPermissions = {
      ...user,
      permissions: finalPermissions,
      // Remove raw plan_permissions from response to keep it clean
      plan_permissions: undefined
    };

    res.json({ success: true, user: userWithPermissions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/profile/team
router.get('/team', authenticate, async (req, res) => {
  try {
    const [rows] = await query(
      `SELECT id, name, email, role, department, status, created_at 
       FROM users`
    );
    res.json({ success: true, users: rows });
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

  if (!updates.length) {
    return res.status(400).json({ success: false, message: 'No changes provided' });
  }

  try {
    values.push(req.user.id);
    await query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);

    // Return updated user
    const [updated] = await query(
      `SELECT id, name, email, company, contact_phone, plan_id, credits_available, channels_enabled 
       FROM users WHERE id = ?`,
      [req.user.id]
    );

    // Notify Admins
    try {
      await sendAdminNotification(updated[0], 'PROFILE_UPDATE');
    } catch (emailErr) {
      console.error('Failed to send admin notification:', emailErr);
    }

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
    const [updated] = await query('SELECT id, name, email, role, company, channels_enabled FROM users WHERE id = ?', [req.user.id]);
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

    res.json({
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

module.exports = router;