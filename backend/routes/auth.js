const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
const { logSystem } = require('../utils/logger');
const { getDeviceFriendlyName, formatIP, getLocation } = require('../utils/deviceDetector');
const { sendSMS } = require('../utils/smsService');

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

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

if (!JWT_SECRET) {
  console.error('JWT_SECRET missing in .env file! Authentication will fail.');
}

// Robust Default Permissions for Different Roles
const DEFAULT_CLIENT_PERMISSIONS = [
  { feature: 'Dashboard - View', admin: 1 },
  { feature: 'Template - View', admin: 1 },
  { feature: 'Template - Create', admin: 1 },
  { feature: 'Template - Edit', admin: 1 },
  { feature: 'Template - Delete', admin: 1 },
  { feature: 'Campaigns - View', admin: 1 },
  { feature: 'Campaigns - Create', admin: 1 },
  { feature: 'Campaigns - Edit', admin: 1 },
  { feature: 'Campaigns - Delete', admin: 1 },
  { feature: 'Campaigns - Report', admin: 1 },
  { feature: 'Contacts - View', admin: 1 },
  { feature: 'Contacts - Create', admin: 1 },
  { feature: 'Contacts - Edit', admin: 1 },
  { feature: 'Contacts - Delete', admin: 1 },
  { feature: 'Contacts - Export', admin: 1 },
  { feature: 'Contacts - Import', admin: 1 },
  { feature: 'Chat - View', admin: 1 },
  { feature: 'Chat - Reply', admin: 1 },
  { feature: 'Chat - Assign', admin: 1 },
  { feature: 'Chat - Close', admin: 1 },
  { feature: 'API & Webhooks - View', admin: 1 },
  { feature: 'API & Webhooks - Manage', admin: 1 },
  { feature: 'Automations - View', admin: 1 },
  { feature: 'Automations - Create', admin: 1 },
  { feature: 'Automations - Edit', admin: 1 },
  { feature: 'Automations - Delete', admin: 1 },
  { feature: 'Chatflows - View', admin: 1 },
  { feature: 'Chatflows - Create', admin: 1 },
  { feature: 'Chatflows - Edit', admin: 1 },
  { feature: 'Chatflows - Delete', admin: 1 },
  { feature: 'DLT Templates - View', admin: 1 },
  { feature: 'DLT Templates - Create', admin: 1 },
  { feature: 'DLT Templates - Edit', admin: 1 },
  { feature: 'DLT Templates - Delete', admin: 1 },
  { feature: 'Reports - View', admin: 1 },
  { feature: 'Wallet - View', admin: 1 },
  { feature: 'Settings - View', admin: 1 }
];

const DEFAULT_RESELLER_PERMISSIONS = [
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
        // Update user with new OTP - DO NOT update status here (prevents un-suspending accidentally)
        await query('UPDATE users SET otp = ?, otp_expiry = ? WHERE id = ?', [otp, expiry, users[0].id]);
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
          // Email uses standard .env SMTP settings
          await sendEmail(target, 'Your Verification Code', `Your OTP is ${otp}. It expires in 5 minutes.`, otp);
        } else {
          // Send via Official Internal SMS API
          console.log(`[AUTH] Sending SMS OTP: ${otp} to ${target} via Internal API...`);
          const msg = `Dear Customer, Your One Time Password is ${otp} CMT`;
          const templateId = '1007939764982063485';
          const apiKey = 'nn_c44eaf15fad864bdcb6258bf566c39b945fe8de4006470ec';
          
          try {
            const axios = require('axios');
            // Dynamically detect the correct local port (5000 or 5050)
            const currentPort = process.env.PORT || (is_signup ? '5000' : '5050'); 
            const smsUrl = `http://localhost:${currentPort}/api/sms-v1/send?apiKey=${apiKey}&mobile=${target}&message=${encodeURIComponent(msg)}&templateId=${templateId}`;
            
            console.log(`[AUTH] Hitting internal SMS API: ${smsUrl.replace(/apiKey=[^&]+/, 'apiKey=********')}`);
            const response = await axios.get(smsUrl);
            console.log(`[AUTH] Internal SMS API Response:`, response.data);
          } catch (internalErr) {
            console.warn(`[AUTH] Internal API failed at port ${process.env.PORT || 'unknown'}, falling back to direct sendService:`, internalErr.message);
            await sendSMS(target, msg, templateId);
          }
        }
        return res.json({ success: true, message: 'OTP sent successfully' });
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

  const normalizedIdentifier = identifier.trim().toLowerCase();

  try {
    // Check email or phone with Plan Permissions and User Permissions
    const [rows] = await query(`
      SELECT u.*, p.permissions as plan_permissions, p.name as plan_name, 
             COALESCE(r.id, u.reseller_id) as actual_reseller_id
      FROM users u
      LEFT JOIN plans p ON u.plan_id = p.id
      LEFT JOIN resellers r ON u.email = r.email AND u.role = 'reseller'
      WHERE LOWER(u.email) = ? OR u.contact_phone = ?
    `, [normalizedIdentifier, normalizedIdentifier]);
    if (!rows.length) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    let user = null;
    let match = false;
    for (const row of rows) {
      match = await bcrypt.compare(password, row.password);
      if (match) {
        user = row;
        break;
      }
    }

    if (!user || !match) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    
    // Check if account is suspended
    if (user.status === 'suspended') {
      return res.status(403).json({ 
        success: false, 
        message: 'Your account has been suspended. Please contact support.' 
      });
    }

    // 1. Priority: User-specific overrides
    let finalPermissions = null; // Start as null to detect absence
    if (user.permissions) {
      try {
        const parsed = typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions;
        if (Array.isArray(parsed)) finalPermissions = parsed; 
      } catch (e) { console.error('Error parsing permissions:', e); }
    }

    // 2. Fallback: Plan permissions (If user has no specific overrides)
    if (finalPermissions === null && user.plan_permissions) {
      try {
        const parsed = typeof user.plan_permissions === 'string' ? JSON.parse(user.plan_permissions) : user.plan_permissions;
        if (Array.isArray(parsed)) finalPermissions = parsed;
      } catch (e) { console.error('Error parsing plan permissions:', e); }
    }
    
    // 3. Last Resort: Global Defaults by Role (Only if truly null - absence of settings)
    if (finalPermissions === null) {
      // console.log(`[AUTH] No permissions found for user ${user.email}, applying role defaults for: ${user.role}`);
      if (user.role === 'reseller') {
        finalPermissions = DEFAULT_RESELLER_PERMISSIONS;
      } else if (user.role === 'client' || user.role === 'user') {
        finalPermissions = DEFAULT_CLIENT_PERMISSIONS;
      } else if (user.role === 'admin' || user.role === 'superadmin') {
          finalPermissions = DEFAULT_CLIENT_PERMISSIONS.concat(DEFAULT_RESELLER_PERMISSIONS);
      } else {
        finalPermissions = [];
      }
    } else {
      console.log(`[AUTH] Using explicit permissions for user ${user.email} (Count: ${finalPermissions.length})`);
    }

    const compressed = compressPermissions(finalPermissions);
/* console.log(`[AUTH] Final compressed permissions for ${user.email}: ${JSON.stringify(compressed)}`); */

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
        wa_authentication_price: user.wa_authentication_price,
        sms_promotional_price: user.sms_promotional_price,
        sms_transactional_price: user.sms_transactional_price,
        sms_service_price: user.sms_service_price
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

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

    return res.json({
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
        permissions: compressPermissions(finalPermissions),
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
        wa_authentication_price: user.wa_authentication_price,
        sms_promotional_price: user.sms_promotional_price,
        sms_transactional_price: user.sms_transactional_price,
        sms_service_price: user.sms_service_price
      }
    });

  } catch (err) {
    console.error('Login Error:', err);
    const deviceInfo = getDeviceFriendlyName(req.headers['user-agent']);
    const ip = formatIP(req.ip);
    const location = await getLocation(req.ip);
    
    if (!res.headersSent) {
      await logSystem('error', 'Login Failed', `Error: ${err.message}`, null, null, null, ip, 'error', deviceInfo, location);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
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

      // Check if account is suspended
      if (user.status === 'suspended') {
        return res.status(403).json({ 
          success: false, 
          message: 'Your account has been suspended. Please contact support.' 
        });
      }
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

    return res.json({
      success: true, token,
      user: {
        id: user.id, name: user.name, email: user.email, role: user.role,
        channels_enabled: user.channels_enabled, permissions: compressPermissions(finalPermissions), plan_name: user.plan_name,
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

      // Check if account is suspended
      if (user.status === 'suspended') {
        return res.status(403).json({ 
          success: false, 
          message: 'Your account has been suspended. Please contact support.' 
        });
      }
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

    let finalPermissions = null;
    if (user.permissions !== null && user.permissions !== undefined) {
      try { finalPermissions = typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions; } catch (e) {}
    }

    if (finalPermissions === null && user.plan_permissions) {
      try { finalPermissions = typeof user.plan_permissions === 'string' ? JSON.parse(user.plan_permissions) : user.plan_permissions; } catch (e) {}
    }

    if (finalPermissions === null) {
      finalPermissions = (user.role === 'reseller') ? DEFAULT_RESELLER_PERMISSIONS : DEFAULT_CLIENT_PERMISSIONS;
    }

    const compressed = compressPermissions(finalPermissions);

    const token = jwt.sign({
        id: user.id, email: user.email, role: user.role, name: user.name,
        company: user.company, channels_enabled: user.channels_enabled,
        permissions: compressed, wallet_balance: user.wallet_balance,
        credits_available: user.credits_available,
        actual_reseller_id: user.actual_reseller_id || null
      },
      JWT_SECRET, { expiresIn: JWT_EXPIRES_IN }
    );

    const deviceInfo = getDeviceFriendlyName(req.headers['user-agent']);
    const ip = formatIP(req.ip);
    const location = await getLocation(req.ip);

    await logSystem('login', 'User LinkedIn Login', `User ${user.email} logged in via LinkedIn`, user.id, user.name, user.company, ip, 'info', deviceInfo, location);

    return res.json({
      success: true, token,
      user: {
        id: user.id, name: user.name, email: user.email, role: user.role,
        channels_enabled: user.channels_enabled, permissions: compressed, plan_name: user.plan_name,
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

      // Check if account is suspended
      if (user.status === 'suspended') {
        return res.status(403).json({ 
          success: false, 
          message: 'Your account has been suspended. Please contact support.' 
        });
      }
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

    let finalPermissions = null;
    if (user.permissions !== null && user.permissions !== undefined) {
      try { finalPermissions = typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions; } catch (e) {}
    }

    if (finalPermissions === null && user.plan_permissions) {
      try { finalPermissions = typeof user.plan_permissions === 'string' ? JSON.parse(user.plan_permissions) : user.plan_permissions; } catch (e) {}
    }

    if (finalPermissions === null) {
      finalPermissions = (user.role === 'reseller') ? DEFAULT_RESELLER_PERMISSIONS : DEFAULT_CLIENT_PERMISSIONS;
    }

    const compressed = compressPermissions(finalPermissions);

    const token = jwt.sign({
        id: user.id, email: user.email, role: user.role, name: user.name,
        company: user.company, channels_enabled: user.channels_enabled,
        permissions: compressed, wallet_balance: user.wallet_balance,
        credits_available: user.credits_available,
        actual_reseller_id: user.actual_reseller_id || null
      },
      JWT_SECRET, { expiresIn: JWT_EXPIRES_IN }
    );

    const deviceInfo = getDeviceFriendlyName(req.headers['user-agent']);
    const ip = formatIP(req.ip);
    const location = await getLocation(req.ip);

    await logSystem('login', 'User Facebook Login', `User ${user.email} logged in via Facebook`, user.id, user.name, user.company, ip, 'info', deviceInfo, location);

    return res.json({
      success: true, token,
      user: {
        id: user.id, name: user.name, email: user.email, role: user.role,
        channels_enabled: user.channels_enabled, permissions: compressed, plan_name: user.plan_name,
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

  const normalizedIdentifier = identifier.trim().toLowerCase();
  const trimmedOtp = otp.toString().trim();

  try {
    // Check email or mobile
    const [rows] = await query('SELECT * FROM users WHERE LOWER(email) = ? OR contact_phone = ?', [normalizedIdentifier, normalizedIdentifier]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'User not found' });
    const user = rows[0];

    if (String(user.otp).trim() !== trimmedOtp) {
      console.warn(`[AUTH] Invalid OTP for ${normalizedIdentifier}: DB has '${user.otp}', received '${trimmedOtp}'`);
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }
    if (new Date() > new Date(user.otp_expiry)) return res.status(400).json({ success: false, message: 'OTP expired' });

    return res.json({ success: true, message: 'OTP verified' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Signup (Complete Registration)
router.post('/signup', async (req, res) => {
  const { identifier, password, otp, name, company } = req.body;
  const normalizedIdentifier = (identifier || '').trim().toLowerCase();
  const trimmedOtp = (otp || '').toString().trim();

  console.log(`[AUTH] Signup - Identifier: ${normalizedIdentifier}, Received OTP: ${trimmedOtp}`);

  if (!normalizedIdentifier || !password || !trimmedOtp) return res.status(400).json({ success: false, message: 'Missing fields' });

  try {
    const [rows] = await query('SELECT * FROM users WHERE LOWER(email) = ? OR contact_phone = ?', [normalizedIdentifier, normalizedIdentifier]);
    if (!rows.length) {
       console.warn(`[AUTH] Signup User not found for: ${normalizedIdentifier}`);
       return res.status(400).json({ success: false, message: 'User not found (OTP not sent?)' });
    }
    const user = rows[0];

    console.log(`[AUTH] Signup - User found: ${user.id}, DB OTP: ${user.otp}, Received: ${trimmedOtp}`);

    if (String(user.otp).trim() !== trimmedOtp) {
      console.warn(`[AUTH] Invalid OTP for ${normalizedIdentifier}: DB has '${user.otp}', received '${trimmedOtp}'`);
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

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
    let finalPermissions = DEFAULT_CLIENT_PERMISSIONS; // Default for new user
    // (Optimization: we just set permissions, so we know they are DEFAULT_CLIENT_PERMISSIONS)

    const token = jwt.sign(
      {
        id: finalUser.id,
        email: finalUser.email,
        role: 'user',
        name: finalUser.name,
        channels_enabled: finalUser.channels_enabled,
        permissions: compressPermissions(DEFAULT_CLIENT_PERMISSIONS),
        wallet_balance: finalUser.wallet_balance,
        credits_available: finalUser.credits_available,
        rcs_text_price: finalUser.rcs_text_price,
        rcs_rich_card_price: finalUser.rcs_rich_card_price,
        rcs_carousel_price: finalUser.rcs_carousel_price,
        wa_marketing_price: finalUser.wa_marketing_price,
        wa_utility_price: finalUser.wa_utility_price,
        wa_authentication_price: finalUser.wa_authentication_price,
        sms_promotional_price: finalUser.sms_promotional_price,
        sms_transactional_price: finalUser.sms_transactional_price,
        sms_service_price: finalUser.sms_service_price
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
        permissions: compressPermissions(DEFAULT_CLIENT_PERMISSIONS),
        wallet_balance: finalUser.wallet_balance,
        credits_available: finalUser.credits_available,
        rcs_text_price: finalUser.rcs_text_price,
        rcs_rich_card_price: finalUser.rcs_rich_card_price,
        rcs_carousel_price: finalUser.rcs_carousel_price,
        wa_marketing_price: finalUser.wa_marketing_price,
        wa_utility_price: finalUser.wa_utility_price,
        wa_authentication_price: finalUser.wa_authentication_price,
        sms_promotional_price: finalUser.sms_promotional_price,
        sms_transactional_price: finalUser.sms_transactional_price,
        sms_service_price: finalUser.sms_service_price
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

    return res.json({ success: true, message: 'Profile updated' });
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
    let finalPermissions = null;
    if (user.permissions !== null && user.permissions !== undefined) {
      try {
        finalPermissions = typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions;
      } catch (e) {}
    } 
    
    if (finalPermissions === null && user.plan_permissions) {
      try {
        finalPermissions = typeof user.plan_permissions === 'string' ? JSON.parse(user.plan_permissions) : user.plan_permissions;
      } catch (e) {}
    }

    if (finalPermissions === null) {
      finalPermissions = (user.role === 'reseller') ? DEFAULT_RESELLER_PERMISSIONS : DEFAULT_CLIENT_PERMISSIONS;
    }

    const userWithPermissions = {
      ...user,
      permissions: compressPermissions(finalPermissions)
    };

    return res.json({ success: true, user: userWithPermissions });
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
    return res.json({ success: true });
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
    return res.json({ success: true, users: rows });
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

    return res.json({ success: true, message: 'Reset OTP sent' });
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

    return res.json({ success: true, message: 'Password reset successful' });
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
