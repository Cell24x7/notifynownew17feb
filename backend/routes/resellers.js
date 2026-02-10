const express = require('express');
const bcrypt = require('bcryptjs'); // Import bcrypt
const { query } = require('../config/db');

const router = express.Router();

// GET all resellers
router.get('/', async (req, res) => {
  try {
    const [rows] = await query(`
      SELECT 
        id, name, email, phone, domain, api_base_url,
        commission_percent, status, revenue_generated,
        clients_managed, payout_pending, created_at,
        plan_id, channels_enabled, permissions
      FROM resellers
      ORDER BY created_at DESC
    `);

    const resellers = rows.map(r => ({
      ...r,
      permissions: typeof r.permissions === 'string' ? JSON.parse(r.permissions) : r.permissions
    }));

    res.json({ success: true, resellers });
  } catch (err) {
    console.error('GET RESELLERS ERROR:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch resellers' });
  }
});

// ADD reseller
router.post('/', async (req, res) => {
  console.log('RESELLER POST BODY:', req.body);
  const {
    name, email, phone = null, domain = null, api_base_url = null,
    commission_percent = 10, status = 'active',
    plan_id = null, channels_enabled = [],
    password // New field
  } = req.body;

  if (!name || !email) {
    return res.status(400).json({ success: false, message: 'Name and email are required' });
  }

  // Ensure channels_enabled is a JSON string if it's an object/array
  const channelsJson = Array.isArray(channels_enabled)
    ? JSON.stringify(channels_enabled)
    : channels_enabled;

  try {
    // 1. Check if email exists in USERS table (Reseller must have a user account to login)
    const [existingUser] = await query('SELECT id FROM users WHERE email = ?', [email]);

    let userId;

    if (existingUser.length > 0) {
      // Option A: Link to existing user? Or fail?
      // For now, let's fail if user exists but isn't a reseller, strict safety.
      // Or if you want to allow converting a user to reseller, logic would be complex.
      // Simple approach: Email collision = Error.
      return res.status(409).json({ success: false, message: 'Email already registered as a User/Reseller' });
    } else {
      // 2. Create User Account for Reseller
      if (!password) {
        return res.status(400).json({ success: false, message: 'Password is required to create a reseller account' });
      }
      const hashedPassword = await bcrypt.hash(password, 10);

      const [userResult] = await query(`
            INSERT INTO users (name, email, password, role, plan_id, status)
            VALUES (?, ?, ?, 'reseller', ?, ?)
        `, [name, email, hashedPassword, plan_id, status]);

      userId = userResult.insertId;
      console.log('Created User for Reseller:', userId);
    }

    console.log('Inserting Reseller Profile:', { name, email, plan_id });

    const [result] = await query(`
      INSERT INTO resellers (
        name, email, phone, domain, api_base_url, 
        commission_percent, status, 
        revenue_generated, clients_managed, payout_pending,
        plan_id, channels_enabled
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 0, ?, ?)
    `, [
      name, email, phone, domain, api_base_url,
      commission_percent, status,
      plan_id, channelsJson
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
  console.log(`RESELLER PUT/${req.params.id} BODY:`, req.body);
  const resellerId = req.params.id;
  const {
    name, email, phone, domain, api_base_url,
    commission_percent, status,
    plan_id, channels_enabled, permissions,
    password // New field
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
  if (plan_id !== undefined) { fields.push('plan_id = ?'); values.push(plan_id); }

  if (channels_enabled !== undefined) {
    const channelsJson = Array.isArray(channels_enabled)
      ? JSON.stringify(channels_enabled)
      : channels_enabled;
    fields.push('channels_enabled = ?');
    values.push(channelsJson);
  }

  if (permissions !== undefined) {
    fields.push('permissions = ?');
    values.push(JSON.stringify(permissions));
  }

  if (!fields.length && !password) { // If no fields AND no password
    return res.status(400).json({ success: false, message: 'No fields to update' });
  }

  try {
    // Update Reseller Record
    if (fields.length > 0) {
      const sql = `UPDATE resellers SET ${fields.join(', ')} WHERE id = ?`;
      const resellerValues = [...values, resellerId];
      await query(sql, resellerValues);
    }

    // Handle Password / User Account Update
    if (password || name || email || status || permissions) {
      // Need to find which user corresponds to this reseller.
      // Usually checked by email. 
      // Note: If email is being changed, we need the OLD email to find the user, or we assume the frontend sends the *original* email if it hasn't changed.
      // Risk: If email is changed in `resellers` above, looking up by `email` (new one) might fail if we haven't updated `users` yet. 
      // Better strategy: Get the current reseller email FIRST before updating.

      // Let's assume for safety we sync based on the *result* of the reseller query if we didn't have the user ID linked.
      // But since we don't store user_id in resellers table (based on schema), we rely on email. 

      // Correct Flow:
      // 1. Get current reseller email (to find the user)
      const [currentReseller] = await query('SELECT * FROM resellers WHERE id = ?', [resellerId]);

      if (currentReseller.length > 0) {
        const oldEmail = currentReseller[0].email;
        const resellerData = currentReseller[0];

        // Check if user exists
        const [existingUser] = await query('SELECT id FROM users WHERE email = ?', [oldEmail]);

        if (existingUser.length > 0) {
          // UPDATE Existing User
          const userFields = [];
          const userValues = [];

          if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            userFields.push('password = ?');
            userValues.push(hashedPassword);
          }
          if (name) { userFields.push('name = ?'); userValues.push(name); }
          if (email) { userFields.push('email = ?'); userValues.push(email); }
          if (status) { userFields.push('status = ?'); userValues.push(status); }
          if (plan_id) { userFields.push('plan_id = ?'); userValues.push(plan_id); }

          // Sync Permissions to User Table
          if (permissions !== undefined) {
            userFields.push('permissions = ?');
            userValues.push(JSON.stringify(permissions));
          }

          if (userFields.length > 0) {
            const userSql = `UPDATE users SET ${userFields.join(', ')} WHERE email = ?`;
            userValues.push(oldEmail);
            await query(userSql, userValues);
            console.log('Updated User account for Reseller (including permissions)');
          }
        } else {
          // CREATE New User (Backfill for existing reseller)
          console.log('User not found for Reseller, creating new User account...');
          if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            // Use new values if provided, else fallback to existing reseller data
            const newName = name || resellerData.name;
            const newEmail = email || oldEmail;
            const newStatus = status || resellerData.status || 'active';
            const newPlanId = plan_id || resellerData.plan_id;

            // Check if new email is already taken by another user (edge case)
            const [emailCheck] = await query('SELECT id FROM users WHERE email = ?', [newEmail]);
            if (emailCheck.length === 0) {
              await query(`
                            INSERT INTO users (name, email, password, role, plan_id, status)
                            VALUES (?, ?, ?, 'reseller', ?, ?)
                         `, [newName, newEmail, hashedPassword, newPlanId, newStatus]);
              console.log('Created missing User account for Reseller');
            } else {
              console.log('Cannot create user: Email already exists (but not linked? confusing state).');
            }
          } else {
            console.log('Cannot create User account: Password is required for new user.');
          }
        }
      }
    }

    res.json({ success: true, message: 'Reseller updated' });
  } catch (err) {
    console.error('UPDATE RESELLER ERROR:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;