const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { query } = require('../config/db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('JWT_SECRET missing in .env file! Server cannot start.');
  process.exit(1);
}

// Nodemailer Transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'test@example.com',
    pass: process.env.EMAIL_PASS || 'password'
  }
});

const sendEmail = async (to, subject, text) => {
  if (!process.env.EMAIL_USER) {
    console.log(`[DEV MODE] Email to ${to}: ${subject} \n${text}`);
    return;
  }
  try {
    await transporter.sendMail({ from: process.env.EMAIL_USER, to, subject, text });
  } catch (err) {
    console.error('Email send failed:', err);
  }
};

// Login
router.post('/login', async (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) return res.status(400).json({ success: false, message: 'Identifier and password required' });

  try {
    // Check email or phone
    const [rows] = await query('SELECT * FROM users WHERE email = ? OR contact_phone = ?', [identifier, identifier]);
    if (!rows.length) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name, company: user.company },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        company: user.company,
        role: user.role
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Send OTP
router.post('/send-otp', async (req, res) => {
  const { email, mobile, is_signup } = req.body;
  const target = email || mobile;
  const type = email ? 'email' : 'mobile';

  if (!target) return res.status(400).json({ success: false, message: 'Email or Mobile required' });

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

    // Prevent duplicate signup
    if (is_signup && users.length > 0) {
      // Allow if user is not verified yet (failed previous signup), else block
      if (users[0].is_verified) {
        return res.status(400).json({ success: false, message: 'Account already exists. Please login.' });
      }
    }

    if (users.length === 0) {
      // New User
      if (type === 'email') {
        await query(
          'INSERT INTO users (email, otp, otp_expiry, is_verified, role, password, name) VALUES (?, ?, ?, 0, "user", ?, ?)',
          [target, otp, expiry, 'TEMP_PASS_HASH', 'New User']
        );
      } else {
        // Mobile signup - use placeholder email
        const placeholderEmail = `${target}@phone.cell24x7.com`;
        await query(
          'INSERT INTO users (email, contact_phone, otp, otp_expiry, is_verified, role, password, name) VALUES (?, ?, ?, ?, 0, "user", ?, ?)',
          [placeholderEmail, target, otp, expiry, 'TEMP_PASS_HASH', 'New User']
        );
      }
    } else {
      // Update existing
      await query('UPDATE users SET otp = ?, otp_expiry = ? WHERE id = ?', [otp, expiry, users[0].id]);
    }

    // Send OTP
    if (type === 'email') {
      await sendEmail(target, 'Your Verification Code', `Your OTP is ${otp}. It expires in 5 minutes.`);
    } else {
      console.log(`[MOBILE OTP] To ${target}: ${otp}`);
    }

    res.json({ success: true, message: 'OTP sent successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to send OTP' });
  }
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body; // 'email' field in body might contain mobile number from frontend
  const identifier = email;

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
  const { email, password, otp, name, company } = req.body; // email field holds identifier
  const identifier = email;

  if (!identifier || !password || !otp) return res.status(400).json({ success: false, message: 'Missing fields' });

  try {
    const [rows] = await query('SELECT * FROM users WHERE email = ? OR contact_phone = ?', [identifier, identifier]);
    if (!rows.length) return res.status(400).json({ success: false, message: 'User not found (OTP not sent?)' });
    const user = rows[0];

    if (user.otp !== otp) return res.status(400).json({ success: false, message: 'Invalid OTP' });

    // Hash password
    const hash = await bcrypt.hash(password, 10);

    // Update user
    await query(
      'UPDATE users SET password = ?, name = ?, company = ?, is_verified = 1, otp = NULL WHERE id = ?',
      [hash, name || 'User', company || null, user.id]
    );

    const token = jwt.sign(
      { id: user.id, email: user.email, role: 'user', name: name || 'User' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      success: true,
      token,
      user: { id: user.id, name: name || 'User', email: user.email, company, role: 'user' }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Signup failed' });
  }
});


const authenticate = require('../middleware/authMiddleware');

// Update Profile
router.put('/update-profile', authenticate, async (req, res) => {
  const { full_name, company, password } = req.body;
  try {
    const updates = [];
    const params = [];

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
    res.status(500).json({ success: false });
  }
});


// Get current user
router.get('/me', authenticate, async (req, res) => {
  try {
    const [rows] = await query('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (!rows.length) return res.status(404).json({ success: false });
    res.json({ success: true, user: rows[0] });
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

// Forgot Password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, message: 'Email required' });

  try {
    const [rows] = await query('SELECT * FROM users WHERE email = ?', [email]);
    if (!rows.length) {
      // Do not reveal if user exists, just simulate success delay
      return res.json({ success: true, message: 'Reset link sent if email exists' });
    }

    // Generate Reset Token (Or just use OTP logic for simplicity as requested "OTP bhi kam kare")
    // User requested "forget password click karu to ye bhi kam kare"
    // We'll send a temporary password or reset link. For now, let's send a Reset OTP.
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
    expiry.setMilliseconds(0);

    await query('UPDATE users SET otp = ?, otp_expiry = ? WHERE id = ?', [otp, expiry, rows[0].id]);
    await sendEmail(email, 'Password Reset Request', `Your Password Reset OTP is ${otp}.`);

    res.json({ success: true, message: 'Reset OTP sent' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Reset Password
router.post('/reset-password', async (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) {
    return res.status(400).json({ success: false, message: 'All fields required' });
  }

  try {
    const [rows] = await query('SELECT * FROM users WHERE email = ?', [email]);
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

// Verify logic (Mock for now, or just /me)
// The user asked for "Welcome popup" which is frontend, driven by signup success.

module.exports = router;