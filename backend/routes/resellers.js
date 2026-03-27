const express = require('express');
const bcrypt = require('bcryptjs'); 
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
const authenticate = require('../middleware/authMiddleware'); // Moved to top

const router = express.Router();

// GET all resellers (Admin only)
router.get('/', authenticate, async (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    return res.status(403).json({ success: false, message: 'Unauthorized' });
  }
  try {
    const [rows] = await query(`
      SELECT 
        r.id, r.name, r.email, r.phone, r.domain, r.api_base_url,
        r.commission_percent, r.status, r.revenue_generated,
        r.clients_managed, r.payout_pending, r.created_at,
        r.plan_id, r.channels_enabled, r.permissions,
        r.brand_name, r.logo_url, r.favicon_url, r.primary_color, r.secondary_color,
        r.support_email, r.support_phone,
        u.wallet_balance as credits_available, u.credits_used as credits_spent
      FROM resellers r
      LEFT JOIN users u ON r.email = u.email
      ORDER BY r.created_at DESC
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

// GET whitelabel settings by domain or ID (Public)
router.get('/whitelabel', async (req, res) => {
  const { domain, reseller_id } = req.query;
  console.log(`WHITELABEL FETCH REQUEST - Domain: ${domain}, ID: ${reseller_id}`);

  if (!domain && !reseller_id) {
    return res.json({ success: true, settings: null });
  }

  try {
    let sql = `
      SELECT brand_name, logo_url, favicon_url, primary_color, secondary_color, support_email, support_phone
      FROM resellers
      WHERE status = 'active'
    `;
    let params = [];

    if (reseller_id) {
      sql += " AND id = ?";
      params.push(reseller_id);
    } else {
      sql += " AND domain = ?";
      params.push(domain);
    }

    const [rows] = await query(sql + " LIMIT 1", params);

    if (rows.length === 0) {
      console.log(`No active reseller found for domain: ${domain}`);
      return res.json({ success: true, settings: null });
    }

    res.json({ success: true, settings: rows[0] });
  } catch (err) {
    console.error('WHITELABEL FETCH ERROR:', err.message);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ADD reseller
router.post('/', async (req, res) => {
  console.log('RESELLER POST BODY:', req.body);
  const {
    brand_name, logo_url, favicon_url, primary_color, secondary_color, support_email, support_phone,
    credits_available = 0
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
            INSERT INTO users (name, email, password, role, plan_id, status, wallet_balance, credits_available)
            VALUES (?, ?, ?, 'reseller', ?, ?, ?, ?)
        `, [name, email, hashedPassword, plan_id, status, credits_available, credits_available]);

      userId = userResult.insertId;
      console.log('Created User for Reseller:', userId);
    }

    console.log('Inserting Reseller Profile:', { name, email, plan_id });

    const [result] = await query(`
      INSERT INTO resellers (
        name, email, phone, domain, api_base_url, 
        commission_percent, status, 
        revenue_generated, clients_managed, payout_pending,
        plan_id, channels_enabled,
        brand_name, logo_url, favicon_url, primary_color, secondary_color, support_email, support_phone
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      name, email, phone, domain, api_base_url,
      commission_percent, status,
      plan_id, channelsJson,
      brand_name || name, logo_url, favicon_url, primary_color, secondary_color, support_email, support_phone
    ]);

    res.status(201).json({
      success: true,
      id: result.insertId,
      message: 'Reseller added successfully'
    });

    // Log Initial Transaction for Reseller
    if (credits_available > 0) {
      await query(`
        INSERT INTO transactions (user_id, type, amount, credits, description, status)
        VALUES (?, 'credit', ?, ?, 'Initial Reseller Credits', 'completed')
      `, [userId, credits_available, credits_available]);
    }
  } catch (err) {
    console.error('ADD RESELLER ERROR:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// UPDATE reseller (Admin only)
router.put('/:id', authenticate, async (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    return res.status(403).json({ success: false, message: 'Unauthorized' });
  }
  console.log(`RESELLER PUT/${req.params.id} BODY:`, req.body);
  const resellerId = req.params.id;
  const {
    name, email, phone, domain, api_base_url, commission_percent, status, plan_id, 
    channels_enabled, permissions,
    password,
    brand_name, logo_url, favicon_url, primary_color, secondary_color, support_email, support_phone,
    credits_available
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

  if (brand_name !== undefined) { fields.push('brand_name = ?'); values.push(brand_name); }
  if (logo_url !== undefined) { fields.push('logo_url = ?'); values.push(logo_url); }
  if (favicon_url !== undefined) { fields.push('favicon_url = ?'); values.push(favicon_url); }
  if (primary_color !== undefined) { fields.push('primary_color = ?'); values.push(primary_color); }
  if (secondary_color !== undefined) { fields.push('secondary_color = ?'); values.push(secondary_color); }
  if (support_email !== undefined) { fields.push('support_email = ?'); values.push(support_email); }
  if (support_phone !== undefined) { fields.push('support_phone = ?'); values.push(support_phone); }

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

          if (credits_available !== undefined) {
            const [oldUser] = await query('SELECT credits_available FROM users WHERE id = ?', [existingUser[0].id]);
            const diff = parseFloat(credits_available) - parseFloat(oldUser[0]?.credits_available || 0);
            
            if (diff !== 0) {
              userFields.push('credits_available = ?');
              userValues.push(credits_available);
              userFields.push('wallet_balance = ?');
              userValues.push(credits_available);
              
              // Log Admin Adjustment for Reseller
              await query(`
                INSERT INTO transactions (user_id, type, amount, credits, description, status)
                VALUES (?, ?, ?, ?, 'Admin Adjustment for Reseller', 'completed')
              `, [existingUser[0].id, diff > 0 ? 'credit' : 'debit', Math.abs(diff), Math.abs(diff)]);
            }
          }

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

// GET logged-in reseller's own branding
router.get('/my-branding', authenticate, async (req, res) => {
  if (req.user.role !== 'reseller') {
    return res.status(403).json({ success: false, message: 'Only resellers can access this' });
  }

  try {
    const [rows] = await query(`
      SELECT brand_name, logo_url, favicon_url, primary_color, secondary_color, support_email, support_phone, domain
      FROM resellers
      WHERE email = ?
      LIMIT 1
    `, [req.user.email]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Reseller profile not found' });
    }

    res.json({ success: true, branding: rows[0] });
  } catch (err) {
    console.error('MY BRANDING FETCH ERROR:', err.message);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// UPDATE logged-in reseller's own branding
router.put('/my-branding', authenticate, async (req, res) => {
  if (req.user.role !== 'reseller') {
    return res.status(403).json({ success: false, message: 'Only resellers can access this' });
  }

  const {
    brand_name, logo_url, favicon_url, primary_color, secondary_color, support_email, support_phone
  } = req.body;

  const fields = [];
  const values = [];

  if (brand_name !== undefined) { fields.push('brand_name = ?'); values.push(brand_name); }
  if (logo_url !== undefined) { fields.push('logo_url = ?'); values.push(logo_url); }
  if (favicon_url !== undefined) { fields.push('favicon_url = ?'); values.push(favicon_url); }
  if (primary_color !== undefined) { fields.push('primary_color = ?'); values.push(primary_color); }
  if (secondary_color !== undefined) { fields.push('secondary_color = ?'); values.push(secondary_color); }
  if (support_email !== undefined) { fields.push('support_email = ?'); values.push(support_email); }
  if (support_phone !== undefined) { fields.push('support_phone = ?'); values.push(support_phone); }

  if (fields.length === 0) {
    return res.status(400).json({ success: false, message: 'No fields to update' });
  }

  try {
    const sql = `UPDATE resellers SET ${fields.join(', ')} WHERE email = ?`;
    values.push(req.user.email);
    await query(sql, values);

    res.json({ success: true, message: 'Branding updated successfully' });
  } catch (err) {
    console.error('MY BRANDING UPDATE ERROR:', err.message);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// IMPERSONATE reseller (Admin only)
router.post('/:id/impersonate', authenticate, async (req, res) => {
  const resellerId = req.params.id;

  // Security: Only superadmin/admin can impersonate
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    return res.status(403).json({ success: false, message: 'Forbidden: Admin access required' });
  }

  try {
    // 1. Get reseller email and details
    const [resellers] = await query('SELECT email, name FROM resellers WHERE id = ?', [resellerId]);
    if (resellers.length === 0) {
      return res.status(404).json({ success: false, message: 'Reseller not found' });
    }

    const resellerEmail = resellers[0].email;

    // 2. Get the associated user from the users table
    const [users] = await query('SELECT * FROM users WHERE email = ? AND role = "reseller"', [resellerEmail]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'Associated reseller user account not found' });
    }

    const user = users[0];

    // Robust Permission Resolution (Matches auth.js)
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

    let finalPermissions = null;
    if (user.permissions !== null && user.permissions !== undefined) {
      try { finalPermissions = typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions; } catch (e) {}
    }

    // Fallback logic
    if (finalPermissions === null) {
      // For resellers, we usually have a different set of defaults than users
      // But let's use the explicit list from profile.js for consistency if we wanted, 
      // or just trust the database for now.
      finalPermissions = []; // or actual default list
    }

    const payload = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: 'reseller',
      actual_reseller_id: resellerId,
      impersonatedBy: req.user.role,
      company: user.company || resellers[0].name,
      channels_enabled: user.channels_enabled ? (typeof user.channels_enabled === 'string' ? JSON.parse(user.channels_enabled) : user.channels_enabled) : [],
      permissions: compressPermissions(finalPermissions),
      wallet_balance: user.wallet_balance,
      credits_available: user.credits_available,
      rcs_text_price: user.rcs_text_price,
      rcs_rich_card_price: user.rcs_rich_card_price,
      rcs_carousel_price: user.rcs_carousel_price,
      wa_marketing_price: user.wa_marketing_price,
      wa_utility_price: user.wa_utility_price,
      wa_authentication_price: user.wa_authentication_price,
      iat: Math.floor(Date.now() / 1000)
    };

    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not configured');
    }

    const impersonateToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

    console.log(`[IMPERSONATE] Admin ${req.user.email} logged in as Reseller ${resellerEmail}`);

    res.json({
      success: true,
      token: impersonateToken,
      redirectTo: '/dashboard'
    });
  } catch (err) {
    console.error('IMPERSONATE RESELLER ERROR:', err.message);
    res.status(500).json({ success: false, message: 'Failed to impersonate reseller' });
  }
});

module.exports = router;
