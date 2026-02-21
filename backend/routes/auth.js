const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
const { logSystem } = require('../utils/logger');
const { sendSMS } = require('../utils/smsService');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

if (!JWT_SECRET) {
  console.error('JWT_SECRET missing in .env file! Authentication will fail.');
}

const axios = require('axios');

const { sendEmail, sendAdminNotification } = require('../utils/emailService');

// Removed local sendEmail function as it is now imported from utils/emailService

// Start or Resend OTP (Signup & Forgot Password)
router.post('/send-otp', async (req, res) => {
  const { email, mobile, is_signup, purpose } = req.body; // mobile or email
  let target = mobile || email;

  // Normalize: if frontend sends 'identifier' in email field for everything
  if (!target && req.body.identifier) {
    target = req.body.identifier;
  }

  if (!target) return res.status(400).json({ success: false, message: 'Email or Mobile required' });

  // Simple check for type
  const type = target.includes('@') ? 'email' : 'mobile';

  try {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 5 * 60 * 1000); // 5 mins
    expiry.setMilliseconds(0);

    // Check if user exists
    let userQuery = 'SELECT * FROM users WHERE email = ?';
    let userParams = [target];

    if (type === 'mobile') {
      userQuery = 'SELECT * FROM users WHERE contact_phone = ?';
      userParams = [target];
    }

    let [users] = await query(userQuery, userParams);

    // HANDLING SIGNUP
    if (is_signup) {
      if (users.length > 0) {
        // If user exists and is verified, block signup
        if (users[0].is_verified) {
          return res.status(400).json({ success: false, message: 'Account already exists. Please login.' });
        }
        // If unverified, we will update the OTP below (resend)
      } else {
        // Create new unverified user
        if (type === 'email') {
          await query(
            'INSERT INTO users (email, otp, otp_expiry, is_verified, role, password, name) VALUES (?, ?, ?, 0, "user", ?, ?)',
            [target, otp, expiry, 'TEMP_PASS_HASH', 'New User']
          );
        } else {
          // Mobile signup - require placeholder email if DB enforces not null
          const placeholderEmail = `${target}@phone.cell24x7.com`;
          await query(
            'INSERT INTO users (email, contact_phone, otp, otp_expiry, is_verified, role, password, name) VALUES (?, ?, ?, ?, 0, "user", ?, ?)',
            [placeholderEmail, target, otp, expiry, 'TEMP_PASS_HASH', 'New User']
          );
        }
      }
    }
    // HANDLING FORGOT PASSWORD / LOGIN OTP (if needed)
    else {
      if (users.length === 0) {
        // Security: Don't reveal user not found, but needed for logic. 
        // Return 404 for now as it helps frontend debug. 
        // Production: treat same as success.
        const errorMsg = type === 'email'
          ? 'This email ID does not exist.'
          : 'This mobile number does not exist.';
        return res.status(404).json({ success: false, message: errorMsg });
      }
    }

    // Update OTP on the found/created user
    // Re-fetch to get ID in case we just inserted
    // (Optimization: use INSERT ID, but consistent read is safer)
    [users] = await query(userQuery, userParams);

    if (users.length > 0) {
      await query('UPDATE users SET otp = ?, otp_expiry = ? WHERE id = ?', [otp, expiry, users[0].id]);

      // Send the OTP
      if (type === 'email') {
        await sendEmail(target, 'Your Verification Code', `Your OTP is ${otp}. It expires in 5 minutes.`);
      } else {
        // Send via SMS
        const msg = `Dear Customer, Your One Time Password is ${otp}. CMT`;
        await sendSMS(target, msg);
      }

      res.json({ success: true, message: 'OTP sent successfully' });
    } else {
      res.status(500).json({ success: false, message: 'Failed to create/find user' });
    }

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to send OTP' });
  }
});


// Login (Email/Phone + Password)
router.post('/login', async (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) return res.status(400).json({ success: false, message: 'Identifier and password required' });

  try {
    // Check email or phone with Plan Permissions and User Permissions
    const [rows] = await query(`
      SELECT u.*, p.permissions as plan_permissions, p.name as plan_name
      FROM users u
      LEFT JOIN plans p ON u.plan_id = p.id
      WHERE u.email = ? OR u.contact_phone = ?
    `, [identifier, identifier]);
    if (!rows.length) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    // Logic: User-specific permissions override Plan permissions
    let finalPermissions = [];
    if (user.permissions) {
      // If user has specific overrides
      try {
        finalPermissions = typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions;
      } catch (e) {
        console.error('Error parsing permissions:', e);
        finalPermissions = [];
      }
    } else if (user.plan_permissions) {
      // Fallback to plan permissions
      try {
        finalPermissions = typeof user.plan_permissions === 'string' ? JSON.parse(user.plan_permissions) : user.plan_permissions;
      } catch (e) {
        console.error('Error parsing plan permissions:', e);
        finalPermissions = [];
      }
    }

    // Default Reseller Permissions if none exist (Fix for blank sidebar)
    if (user.role === 'reseller' && (!finalPermissions || finalPermissions.length === 0)) {
      finalPermissions = [
        { feature: 'Dashboard - View', admin: true },
        { feature: 'Clients - View', admin: true },
        { feature: 'Clients - Create', admin: true },
        { feature: 'Templates - View', admin: true },
        { feature: 'Templates - Create', admin: true },
        { feature: 'Plans - View', admin: true },
        { feature: 'Roles - View', admin: true },
        { feature: 'Affiliates - View', admin: true },
        { feature: 'Wallet - View', admin: true },
        { feature: 'Reports - View', admin: true },
        { feature: 'Vendors - View', admin: true },
        { feature: 'Numbers - View', admin: true },
        { feature: 'System Logs - View', admin: true }
      ];
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        company: user.company,
        channels_enabled: user.channels_enabled,
        permissions: finalPermissions,
        wallet_balance: user.wallet_balance,
        credits_available: user.credits_available
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        contact_phone: user.contact_phone,
        company: user.company,
        role: user.role,
        channels_enabled: user.channels_enabled,
        permissions: finalPermissions,
        plan_name: user.plan_name,
        wallet_balance: user.wallet_balance,
        credits_available: user.credits_available
      }
    });

    // Log Successful Login
    await logSystem(
      'login',
      'User Login',
      `User ${user.email} (Phone: ${user.contact_phone}) logged in successfully`,
      user.id,
      user.name,
      user.company,
      req.ip,
      'info'
    );

  } catch (err) {
    console.error(err);
    // Log Login Error
    await logSystem('error', 'Login Failed', `Error: ${err.message}`, null, null, null, req.ip, 'error');
    res.status(500).json({ success: false, message: 'Server error' });
  }
});


// Verify OTP (Used for generic verification)
router.post('/verify-otp', async (req, res) => {
  const { identifier, otp } = req.body; // identifier can be email or mobile

  if (!identifier || !otp) return res.status(400).json({ success: false, message: 'Identifier and OTP required' });

  try {
    // Check email or mobile
    const [rows] = await query('SELECT * FROM users WHERE email = ? OR contact_phone = ?', [identifier, identifier]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'User not found' });
    const user = rows[0];

    if (user.otp !== otp) return res.status(400).json({ success: false, message: 'Invalid OTP' });
    if (new Date() > new Date(user.otp_expiry)) return res.status(400).json({ success: false, message: 'OTP expired' });

    res.json({ success: true, message: 'OTP verified' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Signup (Complete Registration)
router.post('/signup', async (req, res) => {
  // Now accepts mobile as primary identifier
  // identifier = email or mobile
  const { identifier, password, otp, name, company } = req.body;

  console.log('DEBUG: Signup Request:', JSON.stringify(req.body, null, 2));

  if (!identifier || !password || !otp) return res.status(400).json({ success: false, message: 'Missing fields' });

  try {
    const [rows] = await query('SELECT * FROM users WHERE email = ? OR contact_phone = ?', [identifier, identifier]);
    if (!rows.length) return res.status(400).json({ success: false, message: 'User not found (OTP not sent?)' });
    const user = rows[0];

    if (user.otp !== otp) return res.status(400).json({ success: false, message: 'Invalid OTP' });

    // Hash password
    const hash = await bcrypt.hash(password, 10);

    const defaultPermissions = [
      { feature: 'Dashboard - View', admin: true },
      { feature: 'Chat - View', admin: true },
      { feature: 'Chat - Reply', admin: true },
      { feature: 'Chat - Assign', admin: true },
      { feature: 'Chat - Close', admin: true },
      { feature: 'Contacts - View', admin: true },
      { feature: 'Contacts - Create', admin: true },
      { feature: 'Contacts - Edit', admin: true },
      { feature: 'Contacts - Delete', admin: true },
      { feature: 'Contacts - Export', admin: true },
      { feature: 'Contacts - Import', admin: true },
      { feature: 'Campaigns - View', admin: true },
      { feature: 'Campaigns - Create', admin: true },
      { feature: 'Campaigns - Edit', admin: true },
      { feature: 'Campaigns - Delete', admin: true },
      { feature: 'Campaigns - Report', admin: true },
      { feature: 'Automations - View', admin: true },
      { feature: 'Automations - Create', admin: true },
      { feature: 'Automations - Edit', admin: true },
      { feature: 'Automations - Delete', admin: true },
      { feature: 'Integrations - View', admin: true },
      { feature: 'Integrations - Manage', admin: true },
      { feature: 'User Plans - View', admin: true },
      { feature: 'Settings - View', admin: true },
      { feature: 'Settings - Edit', admin: true }
    ];

    const defaultChannels = ["WhatsApp", "SMS", "RCS", "Email"];



    // Dynamic Update Logic
    const updates = ['password = ?', 'name = ?', 'company = ?', 'is_verified = 1', 'otp = NULL', 'permissions = ?', 'channels_enabled = ?'];
    const params = [hash, name || 'User', company || null, JSON.stringify(defaultPermissions), JSON.stringify(defaultChannels)];

    // Handle Secondary Identifier
    if (identifier.includes('@')) {
      // Signup was via Email. Update Mobile if provided.
      if (req.body.mobile) {
        updates.push('contact_phone = ?');
        params.push(req.body.mobile);
      }
    } else {
      // Signup was via Mobile. Update Email if provided.
      if (req.body.email) {
        updates.push('email = ?');
        params.push(req.body.email);
      }
    }

    params.push(user.id); // WHERE clause

    await query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);

    // Verify update success by re-fetching the user
    const [finalUserRows] = await query(
      `SELECT u.*, p.permissions as plan_permissions, p.name as plan_name
       FROM users u
       LEFT JOIN plans p ON u.plan_id = p.id
       WHERE u.id = ?`,
      [user.id]
    );

    const finalUser = finalUserRows[0];

    // Logic: User-specific permissions override Plan permissions (Consistent with Login)
    let finalPermissions = defaultPermissions; // Default for new user
    // (Optimization: we just set permissions, so we know they are defaultPermissions)

    const token = jwt.sign(
      {
        id: finalUser.id,
        email: finalUser.email,
        role: 'user',
        name: finalUser.name,
        channels_enabled: finalUser.channels_enabled,
        permissions: defaultPermissions,
        wallet_balance: finalUser.wallet_balance,
        credits_available: finalUser.credits_available
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(201).json({
      success: true,
      token,
      user: {
        id: finalUser.id,
        name: finalUser.name,
        email: finalUser.email,
        contact_phone: finalUser.contact_phone,
        company: finalUser.company,
        role: 'user',
        channels_enabled: finalUser.channels_enabled,
        permissions: defaultPermissions,
        wallet_balance: finalUser.wallet_balance,
        credits_available: finalUser.credits_available
      }
    });

    // Log Signup
    await logSystem(
      'login',
      'User Signup',
      `New user registered: ${finalUser.contact_phone || finalUser.email}`,
      finalUser.id,
      finalUser.name,
      finalUser.company,
      req.ip,
      'info'
    );

    // Notify Admins
    try {
      await sendAdminNotification({
        id: finalUser.id,
        name: finalUser.name,
        email: finalUser.email,
        contact_phone: finalUser.contact_phone,
        company: finalUser.company,
        role: 'user',
        plan_name: 'Free'
      }, 'SIGNUP');
    } catch (emailErr) {
      console.error('Failed to send admin notification:', emailErr);
    }

  } catch (err) {
    console.error(err);
    // Explicitly handle duplicate entry error
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: 'Email or Mobile already registered.' });
    }
    res.status(500).json({ success: false, message: 'Signup failed' });
  }
});



const authenticate = require('../middleware/authMiddleware');

// Update Profile
router.put('/update-profile', authenticate, async (req, res) => {
  const { full_name, company, password, mobile } = req.body;
  try {
    const updates = [];
    const params = [];

    // --- Special Logic for Mobile Number Update/Merge ---
    if (mobile) {
      // Check if this mobile is already in use
      const [existingUsers] = await query('SELECT * FROM users WHERE contact_phone = ?', [mobile]);

      if (existingUsers.length > 0) {
        const existingUser = existingUsers[0];

        // If it's the SAME user, do nothing different
        if (existingUser.id !== req.user.id) {

          // Check if the existing user is a "Placeholder" account from Mobile Signup
          // A placeholder typically has an email like '1234567890@phone.cell24x7.com'
          const isPlaceholder = existingUser.email && existingUser.email.endsWith('@phone.cell24x7.com');

          if (isPlaceholder) {
            console.log(`🔀 Merging placeholder account ${existingUser.id} into main account ${req.user.id}`);

            // 1. Delete the placeholder account to free up the number
            await query('DELETE FROM users WHERE id = ?', [existingUser.id]);

            // 2. Add the number to the current user
            updates.push('contact_phone = ?');
            params.push(mobile);

            console.log('✅ Merge complete. Number assigned to main account.');
          } else {
            // It's a REAL account with a real email. Cannot merge automatically.
            return res.status(400).json({ success: false, message: 'Mobile number is already linked to another registered account.' });
          }
        }
      } else {
        // Number not in use, just update it
        updates.push('contact_phone = ?');
        params.push(mobile);
      }
    }
    // ----------------------------------------------------

    if (full_name) {
      updates.push('name = ?');
      params.push(full_name);
    }
    if (company) {
      updates.push('company = ?');
      params.push(company);
    }
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      updates.push('password = ?');
      params.push(hash);
    }

    if (updates.length > 0) {
      params.push(req.user.id);
      await query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    res.json({ success: true, message: 'Profile updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: req.body.mobile ? 'Failed to update mobile number' : 'Failed to update profile' });
  }
});


// Get current user
router.get('/me', authenticate, async (req, res) => {
  try {
    const [rows] = await query(`
      SELECT u.*, p.permissions as plan_permissions, p.name as plan_name
      FROM users u
      LEFT JOIN plans p ON u.plan_id = p.id
      WHERE u.id = ?
    `, [req.user.id]);
    if (!rows.length) return res.status(404).json({ success: false });

    // Format response
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
      permissions: finalPermissions
    };

    res.json({ success: true, user: userWithPermissions });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

// Update channels_enabled
router.put('/channels', authenticate, async (req, res) => {
  const { channels } = req.body;
  if (!Array.isArray(channels)) return res.status(400).json({ success: false });
  try {
    await query('UPDATE users SET channels_enabled = ? WHERE id = ?', [JSON.stringify(channels), req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

// Get all users (admin only)
router.get('/users', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Unauthorized' });
  try {
    const [rows] = await query('SELECT id, name, email, role, status FROM users');
    res.json({ success: true, users: rows });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

// Forgot Password (Unified)
router.post('/forgot-password', async (req, res) => {
  const { identifier } = req.body; // email or mobile
  if (!identifier) return res.status(400).json({ success: false, message: 'Email or Mobile required' });

  try {
    const [rows] = await query('SELECT * FROM users WHERE email = ? OR contact_phone = ?', [identifier, identifier]);
    if (!rows.length) {
      // Security: Do not reveal user existence
      return res.json({ success: true, message: 'Reset link/OTP sent if account exists' });
    }

    const user = rows[0];
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
    expiry.setMilliseconds(0);

    await query('UPDATE users SET otp = ?, otp_expiry = ? WHERE id = ?', [otp, expiry, user.id]);

    // Send via appropriate channel
    // If identifier looks like email, send email. If digits, send SMS.
    const isEmail = identifier.includes('@');

    if (isEmail) {
      await sendEmail(identifier, 'Password Reset Request', `Your Password Reset OTP is ${otp}.`);
    } else {
      const msg = `Dear Customer, Your OTP for Password Reset is ${otp}. CMT`;
      await sendSMS(identifier, msg);
    }

    res.json({ success: true, message: 'Reset OTP sent' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Reset Password
router.post('/reset-password', async (req, res) => {
  const { identifier, otp, newPassword } = req.body;
  if (!identifier || !otp || !newPassword) {
    return res.status(400).json({ success: false, message: 'All fields required' });
  }

  try {
    const [rows] = await query('SELECT * FROM users WHERE email = ? OR contact_phone = ?', [identifier, identifier]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'User not found' });
    const user = rows[0];

    if (user.otp !== otp) return res.status(400).json({ success: false, message: 'Invalid OTP' });
    if (new Date() > new Date(user.otp_expiry)) return res.status(400).json({ success: false, message: 'OTP expired' });

    const hash = await bcrypt.hash(newPassword, 10);
    await query('UPDATE users SET password = ?, otp = NULL, otp_expiry = NULL WHERE id = ?', [hash, user.id]);

    res.json({ success: true, message: 'Password reset successful' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
