const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
const { logSystem } = require('../utils/logger');
const { getDeviceFriendlyName, formatIP, getLocation } = require('../utils/deviceDetector');
const { sendSMS } = require('../utils/smsService');

const compressPermissions = (perms) => {
  if (!Array.isArray(perms)) return [];
  // If already objects or strings, let's normalize to objects with admin: true
  if (perms.length > 0 && typeof perms[0] === 'string') {
    return perms.map(p => ({ feature: p, admin: true }));
  }
  // Filter for admin permissions but keep the object structure
  return perms.filter(p => p.admin || p.manager || p.agent);
};

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

if (!JWT_SECRET) {
  console.error('JWT_SECRET missing in .env file! Authentication will fail.');
}

// Robust Default Permissions for Different Roles
const DEFAULT_CLIENT_PERMISSIONS = [
  { feature: 'Dashboard - View', admin: true },
  { feature: 'Template - View', admin: true },
  { feature: 'Template - Create', admin: true },
  { feature: 'Template - Edit', admin: true },
  { feature: 'Template - Delete', admin: true },
  { feature: 'Campaigns - View', admin: true },
  { feature: 'Campaigns - Create', admin: true },
  { feature: 'Campaigns - Edit', admin: true },
  { feature: 'Campaigns - Delete', admin: true },
  { feature: 'Campaigns - Report', admin: true },
  { feature: 'Contacts - View', admin: true },
  { feature: 'Contacts - Create', admin: true },
  { feature: 'Contacts - Edit', admin: true },
  { feature: 'Contacts - Delete', admin: true },
  { feature: 'Contacts - Export', admin: true },
  { feature: 'Contacts - Import', admin: true },
  { feature: 'Chat - View', admin: true },
  { feature: 'Chat - Reply', admin: true },
  { feature: 'Chat - Assign', admin: true },
  { feature: 'Chat - Close', admin: true },
  { feature: 'API & Webhooks - View', admin: true },
  { feature: 'API & Webhooks - Manage', admin: true },
  { feature: 'Automations - View', admin: true },
  { feature: 'Automations - Create', admin: true },
  { feature: 'Automations - Edit', admin: true },
  { feature: 'Automations - Delete', admin: true },
  { feature: 'Chatflows - View', admin: true },
  { feature: 'Chatflows - Create', admin: true },
  { feature: 'Chatflows - Edit', admin: true },
  { feature: 'Chatflows - Delete', admin: true },
  { feature: 'DLT Templates - View', admin: true },
  { feature: 'DLT Templates - Create', admin: true },
  { feature: 'DLT Templates - Edit', admin: true },
  { feature: 'DLT Templates - Delete', admin: true },
  { feature: 'Reports - View', admin: true },
  { feature: 'Wallet - View', admin: true },
  { feature: 'Settings - View', admin: true }
];

const DEFAULT_RESELLER_PERMISSIONS = [
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

const { OAuth2Client } = require('google-auth-library');
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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
    // Check if user exists
    let userQuery = 'SELECT * FROM users WHERE email = ?';
    let userParams = [target];

    if (type === 'mobile') {
      userQuery = 'SELECT * FROM users WHERE contact_phone = ?';
      userParams = [target];
    }

    let [users] = await query(userQuery, userParams);

    let otp;
    let expiry;

    // HANDLING SIGNUP
    if (is_signup) {
      if (users.length > 0) {
        // If user exists and is verified, block signup
        if (users[0].is_verified) {
          return res.status(400).json({ success: false, message: 'Account already exists. Please login.' });
        }
        
        // SMART RESEND: If OTP exists and is NOT expired, and was sent recently, reuse it
        if (users[0].otp && users[0].otp_expiry && new Date() < new Date(users[0].otp_expiry)) {
          console.log(`[AUTH] Reusing valid OTP for ${target}`);
          otp = users[0].otp;
          expiry = users[0].otp_expiry;
        }
      } else {
        // Create new unverified user - will generate new OTP below
      }
    }
    // HANDLING FORGOT PASSWORD / LOGIN OTP (if needed)
    else {
      if (users.length === 0) {
        const errorMsg = type === 'email'
          ? 'This email ID does not exist.'
          : 'This mobile number does not exist.';
        return res.status(404).json({ success: false, message: errorMsg });
      }
      
      // Also check for existing valid OTP for forgot password
      if (users[0].otp && users[0].otp_expiry && new Date() < new Date(users[0].otp_expiry)) {
          console.log(`[AUTH] Reusing valid Forgot Password OTP for ${target}`);
          otp = users[0].otp;
          expiry = users[0].otp_expiry;
      }
    }

    // Generate new OTP if not reused
    if (!otp) {
      otp = Math.floor(100000 + Math.random() * 900000).toString();
      expiry = new Date(Date.now() + 5 * 60 * 1000); // 5 mins
      expiry.setMilliseconds(0);

      if (is_signup && users.length === 0) {
        // Create the user
        if (type === 'email') {
          await query(
            'INSERT INTO users (email, otp, otp_expiry, is_verified, role, password, name, status) VALUES (?, ?, ?, 0, "user", ?, ?, "pending")',
            [target, otp, expiry, 'TEMP_PASS_HASH', 'New User']
          );
        } else {
          const placeholderEmail = `${target}@phone.cell24x7.com`;
          await query(
            'INSERT INTO users (email, contact_phone, otp, otp_expiry, is_verified, role, password, name, status) VALUES (?, ?, ?, ?, 0, "user", ?, ?, "pending")',
            [placeholderEmail, target, otp, expiry, 'TEMP_PASS_HASH', 'New User']
          );
        }
      } else {
        // Update user with new OTP
        await query('UPDATE users SET otp = ?, otp_expiry = ?, status = "pending" WHERE id = ?', [otp, expiry, users[0].id]);
      }
    }

    // Re-fetch to ensure we have the latest state (for logging/send)
    [users] = await query(userQuery, userParams);

    if (users.length > 0) {
      console.log(`[AUTH] Sending OTP to ${target} (${type})...`);
      
      // Send the OTP
      try {
        if (type === 'email') {
          console.log(`[AUTH] Sending Email OTP: ${otp} to ${target}`);
          await sendEmail(target, 'Your Verification Code', `Your OTP is ${otp}. It expires in 5 minutes.`, otp);
        } else {
          // Send via SMS
          console.log(`[AUTH] Sending SMS OTP: ${otp} to ${target}`);
          const msg = `Dear Customer, Your One Time Password is ${otp}. CMT`;
          await sendSMS(target, msg);
        }
        res.json({ success: true, message: 'OTP sent successfully' });
      } catch (sendErr) {
        console.error(`❌ [AUTH] External Send Error:`, sendErr.message);
        throw sendErr; 
      }
    } else {
      res.status(500).json({ success: false, message: 'Failed to create/find user' });
    }

  } catch (err) {
    console.error(`❌ [AUTH] Send-OTP Error for ${target}:`, err);
    res.status(500).json({ success: false, message: `Failed to send OTP: ${err.message}` });
  }
});


// Login (Email/Phone + Password)
router.post('/login', async (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) return res.status(400).json({ success: false, message: 'Identifier and password required' });

  try {
    // Check email or phone with Plan Permissions and User Permissions
    const [rows] = await query(`
      SELECT u.*, p.permissions as plan_permissions, p.name as plan_name, 
             COALESCE(r.id, u.reseller_id) as actual_reseller_id
      FROM users u
      LEFT JOIN plans p ON u.plan_id = p.id
      LEFT JOIN resellers r ON u.email = r.email AND u.role = 'reseller'
      WHERE u.email = ? OR u.contact_phone = ?
    `, [identifier, identifier]);
    if (!rows.length) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    // 1. Priority: User-specific overrides
    let finalPermissions = [];
    if (user.permissions) {
      try {
        const parsed = typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions;
        if (Array.isArray(parsed) && parsed.length > 0) finalPermissions = parsed;
      } catch (e) { console.error('Error parsing permissions:', e); }
    }

    // 2. Fallback: Plan permissions
    if (finalPermissions.length === 0 && user.plan_permissions) {
      try {
        const parsed = typeof user.plan_permissions === 'string' ? JSON.parse(user.plan_permissions) : user.plan_permissions;
        if (Array.isArray(parsed) && parsed.length > 0) finalPermissions = parsed;
      } catch (e) { console.error('Error parsing plan permissions:', e); }
    }

    // 3. Last Resort: Global Defaults by Role (Prevents blank sidebar)
    if (finalPermissions.length === 0) {
      if (user.role === 'reseller') {
        finalPermissions = DEFAULT_RESELLER_PERMISSIONS;
      } else if (user.role === 'client' || user.role === 'user') {
        finalPermissions = DEFAULT_CLIENT_PERMISSIONS;
      } else if (user.role === 'admin' || user.role === 'superadmin') {
          // Admins get everything anyway, but we can set a robust list
          finalPermissions = DEFAULT_CLIENT_PERMISSIONS.concat(DEFAULT_RESELLER_PERMISSIONS);
      }
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        company: user.company,
        channels_enabled: user.channels_enabled,
        permissions: compressPermissions(finalPermissions),
        wallet_balance: user.wallet_balance,
        credits_available: user.credits_available,
        rcs_text_price: user.rcs_text_price,
        rcs_rich_card_price: user.rcs_rich_card_price,
        rcs_carousel_price: user.rcs_carousel_price,
        rcs_config_id: user.rcs_config_id,
        whatsapp_config_id: user.whatsapp_config_id,
        actual_reseller_id: user.actual_reseller_id,
        wa_marketing_price: user.wa_marketing_price,
        wa_utility_price: user.wa_utility_price,
        wa_authentication_price: user.wa_authentication_price
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
        credits_available: user.credits_available,
        rcs_text_price: user.rcs_text_price,
        rcs_rich_card_price: user.rcs_rich_card_price,
        rcs_carousel_price: user.rcs_carousel_price,
        rcs_config_id: user.rcs_config_id,
        whatsapp_config_id: user.whatsapp_config_id,
        actual_reseller_id: user.actual_reseller_id,
        wa_marketing_price: user.wa_marketing_price,
        wa_utility_price: user.wa_utility_price,
        wa_authentication_price: user.wa_authentication_price
      }
    });

    // Log Successful Login
    const deviceInfo = getDeviceFriendlyName(req.headers['user-agent']);
    const ip = formatIP(req.ip);
    const location = await getLocation(req.ip);

    await logSystem(
      'login',
      'User Login',
      `User ${user.role} ${user.email} logged in successfully`,
      user.id,
      user.name,
      user.company,
      ip,
      'info',
      deviceInfo,
      location
    );

  } catch (err) {
    console.error(err);
    const deviceInfo = getDeviceFriendlyName(req.headers['user-agent']);
    const ip = formatIP(req.ip);
    const location = await getLocation(req.ip);
    
    // Log Login Error
    await logSystem('error', 'Login Failed', `Error: ${err.message}`, null, null, null, ip, 'error', deviceInfo, location);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});


// Google Login / Signup
router.post('/google', async (req, res) => {
  const { access_token } = req.body;
  if (!access_token) return res.status(400).json({ success: false, message: 'Access token required' });

  try {
    const response = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` }
    });
    
    const payload = response.data;
    if (!payload.email) return res.status(400).json({ success: false, message: 'Invalid Google token' });

    let [rows] = await query(`
      SELECT u.*, p.permissions as plan_permissions, p.name as plan_name, 
             COALESCE(r.id, u.reseller_id) as actual_reseller_id
      FROM users u
      LEFT JOIN plans p ON u.plan_id = p.id
      LEFT JOIN resellers r ON u.email = r.email AND u.role = 'reseller'
      WHERE u.email = ?
    `, [payload.email]);

    let user;

    if (rows.length > 0) {
      user = rows[0];
    } else {
      const defaultChannels = ["WhatsApp", "SMS", "RCS", "Email"];
      
      const [insertResult] = await query(`
        INSERT INTO users (email, name, role, is_verified, status, provider, permissions, channels_enabled, password, is_social_signup, is_read)
        VALUES (?, ?, 'user', 1, 'pending', 'google', ?, ?, 'SOCIAL_LOGIN_NO_PASSWORD', 1, 0)
      `, [payload.email, payload.name || 'Google User', JSON.stringify(DEFAULT_CLIENT_PERMISSIONS), JSON.stringify(defaultChannels)]);
      
      const insertId = insertResult.insertId;
      
      const [newRows] = await query(`
        SELECT u.*, p.permissions as plan_permissions, p.name as plan_name
        FROM users u
        LEFT JOIN plans p ON u.plan_id = p.id
        WHERE u.id = ?
      `, [insertId]);
      
      user = newRows[0];
    }

    let finalPermissions = [];
    if (user.permissions) {
      try { finalPermissions = typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions; } catch (e) {}
    } else if (user.plan_permissions) {
      try { finalPermissions = typeof user.plan_permissions === 'string' ? JSON.parse(user.plan_permissions) : user.plan_permissions; } catch (e) {}
    }

    const token = jwt.sign({
        id: user.id, email: user.email, role: user.role, name: user.name,
        company: user.company, channels_enabled: user.channels_enabled,
        permissions: compressPermissions(finalPermissions), wallet_balance: user.wallet_balance,
        credits_available: user.credits_available,
        actual_reseller_id: user.actual_reseller_id || null
      },
      JWT_SECRET, { expiresIn: JWT_EXPIRES_IN }
    );

    const deviceInfo = getDeviceFriendlyName(req.headers['user-agent']);
    const ip = formatIP(req.ip);
    const location = await getLocation(req.ip);

    await logSystem('login', 'User Google Login', `User ${user.email} logged in via Google`, user.id, user.name, user.company, ip, 'info', deviceInfo, location);

    res.json({
      success: true, token,
      user: {
        id: user.id, name: user.name, email: user.email, role: user.role,
        channels_enabled: user.channels_enabled, permissions: finalPermissions, plan_name: user.plan_name,
      }
    });

  } catch (error) {
    console.error('Google Auth Error:', error.message);
    res.status(500).json({ success: false, message: 'Google Authentication Failed' });
  }
});


// LinkedIn Login / Signup
router.post('/linkedin', async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ success: false, message: 'Authorization code required' });

  const client_id = process.env.LINKEDIN_CLIENT_ID;
  const client_secret = process.env.LINKEDIN_CLIENT_SECRET;
  const redirect_uri = process.env.LINKEDIN_REDIRECT_URI || 'http://localhost:5173/auth/linkedin/callback';

  try {
    // 1. Exchange code for access token
    const tokenResponse = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', null, {
      params: {
        grant_type: 'authorization_code',
        code,
        client_id,
        client_secret,
        redirect_uri
      },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const { access_token } = tokenResponse.data;

    // 2. Fetch user profile (OpenID Connect userinfo)
    const profileResponse = await axios.get('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    const payload = profileResponse.data;
    if (!payload.email) return res.status(400).json({ success: false, message: 'Invalid LinkedIn token/profile' });

    let [rows] = await query(`
      SELECT u.*, p.permissions as plan_permissions, p.name as plan_name, 
             COALESCE(r.id, u.reseller_id) as actual_reseller_id
      FROM users u
      LEFT JOIN plans p ON u.plan_id = p.id
      LEFT JOIN resellers r ON u.email = r.email AND u.role = 'reseller'
      WHERE u.email = ?
    `, [payload.email]);

    let user;

    if (rows.length > 0) {
      user = rows[0];
    } else {
      const defaultChannels = ["WhatsApp", "SMS", "RCS", "Email"];
      
      const fullName = `${payload.given_name || ''} ${payload.family_name || ''}`.trim() || 'LinkedIn User';
      
      const [insertResult] = await query(`
        INSERT INTO users (email, name, role, is_verified, status, provider, permissions, channels_enabled, password, is_social_signup, is_read)
        VALUES (?, ?, 'user', 1, 'pending', 'linkedin', ?, ?, 'SOCIAL_LOGIN_NO_PASSWORD', 1, 0)
      `, [payload.email, fullName, JSON.stringify(DEFAULT_CLIENT_PERMISSIONS), JSON.stringify(defaultChannels)]);
      
      const insertId = insertResult.insertId;
      
      const [newRows] = await query(`
        SELECT u.*, p.permissions as plan_permissions, p.name as plan_name
        FROM users u
        LEFT JOIN plans p ON u.plan_id = p.id
        WHERE u.id = ?
      `, [insertId]);
      
      user = newRows[0];
    }

    let finalPermissions = [];
    if (user.permissions) {
      try { finalPermissions = typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions; } catch (e) {}
    } else if (user.plan_permissions) {
      try { finalPermissions = typeof user.plan_permissions === 'string' ? JSON.parse(user.plan_permissions) : user.plan_permissions; } catch (e) {}
    }

    const token = jwt.sign({
        id: user.id, email: user.email, role: user.role, name: user.name,
        company: user.company, channels_enabled: user.channels_enabled,
        permissions: compressPermissions(finalPermissions), wallet_balance: user.wallet_balance,
        credits_available: user.credits_available,
        actual_reseller_id: user.actual_reseller_id || null
      },
      JWT_SECRET, { expiresIn: JWT_EXPIRES_IN }
    );

    const deviceInfo = getDeviceFriendlyName(req.headers['user-agent']);
    const ip = formatIP(req.ip);
    const location = await getLocation(req.ip);

    await logSystem('login', 'User LinkedIn Login', `User ${user.email} logged in via LinkedIn`, user.id, user.name, user.company, ip, 'info', deviceInfo, location);

    res.json({
      success: true, token,
      user: {
        id: user.id, name: user.name, email: user.email, role: user.role,
        channels_enabled: user.channels_enabled, permissions: finalPermissions, plan_name: user.plan_name,
      }
    });

  } catch (error) {
    console.error('LinkedIn Auth Error:', error.response?.data || error.message);
    res.status(500).json({ success: false, message: 'LinkedIn Authentication Failed' });
  }
});


// Facebook Login / Signup
router.post('/facebook', async (req, res) => {
  const { accessToken } = req.body;
  if (!accessToken) return res.status(400).json({ success: false, message: 'Access token required' });

  try {
    // 1. Verify token and fetch user profile from Facebook Graph API
    const response = await axios.get(`https://graph.facebook.com/me?fields=id,name,email&access_token=${accessToken}`);
    const payload = response.data;

    if (!payload.email) {
      return res.status(400).json({ success: false, message: 'Facebook account must have an email associated' });
    }

    let [rows] = await query(`
      SELECT u.*, p.permissions as plan_permissions, p.name as plan_name, 
             COALESCE(r.id, u.reseller_id) as actual_reseller_id
      FROM users u
      LEFT JOIN plans p ON u.plan_id = p.id
      LEFT JOIN resellers r ON u.email = r.email AND u.role = 'reseller'
      WHERE u.email = ?
    `, [payload.email]);

    let user;

    if (rows.length > 0) {
      user = rows[0];
    } else {
      const defaultChannels = ["WhatsApp", "SMS", "RCS", "Email"];
      
      const [insertResult] = await query(`
        INSERT INTO users (email, name, role, is_verified, status, provider, permissions, channels_enabled, password, is_social_signup, is_read)
        VALUES (?, ?, 'user', 1, 'pending', 'facebook', ?, ?, 'SOCIAL_LOGIN_NO_PASSWORD', 1, 0)
      `, [payload.email, payload.name || 'Facebook User', JSON.stringify(DEFAULT_CLIENT_PERMISSIONS), JSON.stringify(defaultChannels)]);
      
      const insertId = insertResult.insertId;
      
      const [newRows] = await query(`
        SELECT u.*, p.permissions as plan_permissions, p.name as plan_name
        FROM users u
        LEFT JOIN plans p ON u.plan_id = p.id
        WHERE u.id = ?
      `, [insertId]);
      
      user = newRows[0];
    }

    let finalPermissions = [];
    if (user.permissions) {
      try { finalPermissions = typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions; } catch (e) {}
    } else if (user.plan_permissions) {
      try { finalPermissions = typeof user.plan_permissions === 'string' ? JSON.parse(user.plan_permissions) : user.plan_permissions; } catch (e) {}
    }

    const token = jwt.sign({
        id: user.id, email: user.email, role: user.role, name: user.name,
        company: user.company, channels_enabled: user.channels_enabled,
        permissions: compressPermissions(finalPermissions), wallet_balance: user.wallet_balance,
        credits_available: user.credits_available,
        actual_reseller_id: user.actual_reseller_id || null
      },
      JWT_SECRET, { expiresIn: JWT_EXPIRES_IN }
    );

    const deviceInfo = getDeviceFriendlyName(req.headers['user-agent']);
    const ip = formatIP(req.ip);
    const location = await getLocation(req.ip);

    await logSystem('login', 'User Facebook Login', `User ${user.email} logged in via Facebook`, user.id, user.name, user.company, ip, 'info', deviceInfo, location);

    res.json({
      success: true, token,
      user: {
        id: user.id, name: user.name, email: user.email, role: user.role,
        channels_enabled: user.channels_enabled, permissions: finalPermissions, plan_name: user.plan_name,
      }
    });

  } catch (error) {
    console.error('Facebook Auth Error:', error.response?.data || error.message);
    res.status(500).json({ success: false, message: 'Facebook Authentication Failed' });
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

    if (String(user.otp) !== String(otp)) return res.status(400).json({ success: false, message: 'Invalid OTP' });
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

    if (String(user.otp) !== String(otp)) return res.status(400).json({ success: false, message: 'Invalid OTP' });

    // Hash password
    const hash = await bcrypt.hash(password, 10);

    const defaultChannels = ["WhatsApp", "SMS", "RCS", "Email"];

    // Dynamic Update Logic
    const updates = ['password = ?', 'name = ?', 'company = ?', 'is_verified = 1', 'otp = NULL', 'permissions = ?', 'channels_enabled = ?', 'status = ?', 'is_read = ?'];
    const params = [hash, name || 'User', company || null, JSON.stringify(DEFAULT_CLIENT_PERMISSIONS), JSON.stringify(defaultChannels), 'pending', 0];

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
        permissions: compressPermissions(defaultPermissions),
        wallet_balance: finalUser.wallet_balance,
        credits_available: finalUser.credits_available,
        rcs_text_price: finalUser.rcs_text_price,
        rcs_rich_card_price: finalUser.rcs_rich_card_price,
        rcs_carousel_price: finalUser.rcs_carousel_price,
        wa_marketing_price: finalUser.wa_marketing_price,
        wa_utility_price: finalUser.wa_utility_price,
        wa_authentication_price: finalUser.wa_authentication_price
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
        credits_available: finalUser.credits_available,
        rcs_text_price: finalUser.rcs_text_price,
        rcs_rich_card_price: finalUser.rcs_rich_card_price,
        rcs_carousel_price: finalUser.rcs_carousel_price,
        wa_marketing_price: finalUser.wa_marketing_price,
        wa_utility_price: finalUser.wa_utility_price,
        wa_authentication_price: finalUser.wa_authentication_price
      }
    });

    // Log Signup
    const deviceInfo = getDeviceFriendlyName(req.headers['user-agent']);
    const ip = formatIP(req.ip);
    const location = await getLocation(req.ip);

    await logSystem(
      'login',
      'User Signup',
      `New user registered: ${finalUser.contact_phone || finalUser.email}`,
      finalUser.id,
      finalUser.name,
      finalUser.company,
      ip,
      'info',
      deviceInfo,
      location
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

// Get all users (admin or reseller filtered)
router.get('/users', authenticate, async (req, res) => {
  try {
    let sql = 'SELECT id, name, email, role, status, created_at FROM users';
    let params = [];

    if (req.user.role === 'reseller') {
      sql += ' WHERE reseller_id = ?';
      params.push(req.user.actual_reseller_id);
    } else if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const [rows] = await query(sql, params);
    res.json({ success: true, users: rows });
  } catch (err) {
    console.error('FETCH USERS ERROR:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
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
      await sendEmail(identifier, 'Password Reset Request', `Your Password Reset OTP is ${otp}.`, otp);
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

// CREATE user (Admin or Reseller)
router.post('/users', authenticate, async (req, res) => {
  const { name, email, password, role = 'user', status = 'active' } = req.body;

  if (req.user.role !== 'admin' && req.user.role !== 'superadmin' && req.user.role !== 'reseller') {
    return res.status(403).json({ success: false, message: 'Unauthorized' });
  }

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'Missing fields' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const resellerId = req.user.role === 'reseller' ? req.user.id : (req.body.reseller_id || null);

    const [result] = await query(
      'INSERT INTO users (name, email, password, role, status, reseller_id, is_verified) VALUES (?, ?, ?, ?, ?, ?, 1)',
      [name, email, hashedPassword, role, status, resellerId]
    );

    res.status(201).json({ success: true, id: result.insertId, message: 'User created successfully' });

    // Log User Creation
    await logSystem(
      'admin_action',
      'Create User',
      `Created user ${email} with role ${role}`,
      req.user.id,
      req.user.name,
      req.user.company,
      formatIP(req.ip),
      'info'
    );
  } catch (err) {
    console.error('CREATE USER ERROR:', err.message);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
