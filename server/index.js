require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();

/* ======================
   MIDDLEWARE
====================== */
app.use(express.json());

app.use(cors({
  origin: [
    'http://localhost:8080',
    'http://localhost:5173',
    'http://localhost:3000'
  ],
  credentials: true
}));

/* ======================
   DATABASE
====================== */
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || 'root123',
  database: process.env.DB_NAME || 'cell24x7_db',
  waitForConnections: true,
  connectionLimit: 10
});

pool.getConnection((err, conn) => {
  if (err) {
    console.error('❌ DB Connection Failed:', err.message);
    process.exit(1);
  }
  console.log('✅ MySQL Connected');
  conn.release();
});

/* ======================
   JWT
====================== */
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey123';

/* ======================
   ROOT
====================== */
app.get('/', (req, res) => {
  res.send('Backend running 🚀');
});

/* =====================================================
   🔐 LOGIN  (UNCHANGED)
===================================================== */
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ success: false });

  try {
    const [rows] = await pool.promise().query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (!rows.length)
      return res.status(401).json({ success: false });

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(401).json({ success: false });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '1h' }
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
  } catch {
    res.status(500).json({ success: false });
  }
});

/* =====================================================
   📝 SIGNUP (UNCHANGED)
===================================================== */
app.post('/api/signup', async (req, res) => {
  const { name, company, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ success: false });

  const hash = await bcrypt.hash(password, 10);

  const [result] = await pool.promise().query(
    'INSERT INTO users (name, email, password, company, role) VALUES (?, ?, ?, ?, "user")',
    [name, email, hash, company || null]
  );

  const token = jwt.sign(
    { id: result.insertId, email, role: 'user' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  res.status(201).json({
    success: true,
    token,
    user: { id: result.insertId, name, email, company, role: 'user' }
  });
});

/* =====================================================
   👥 SUPER ADMIN — GET CLIENTS
===================================================== */
app.get('/api/clients', async (req, res) => {
  try {
    const [rows] = await pool.promise().query(`
      SELECT
        id,
        name,
        email,
        company AS company_name,
        contact_phone,
        plan_id,
        credits_available,
        credits_used,
        IFNULL(channels_enabled, '[]') AS channels_enabled,
        status,
        created_at
      FROM users
      WHERE role = 'user'
      ORDER BY id DESC
    `);

    res.json({ success: true, clients: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

/* =====================================================
   ➕ SUPER ADMIN — ADD CLIENT
===================================================== */
app.post('/api/clients', async (req, res) => {
  const {
    name = '',
    company_name = '',
    contact_phone = '',
    email,
    password,
    plan_id = '',
    status = 'active',
    credits_available = 0,
    channels_enabled = []
  } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email & password required' });
  }

  try {
    const [exists] = await pool.promise().query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (exists.length)
      return res.status(409).json({ success: false, message: 'Email already exists' });

    const hash = await bcrypt.hash(password, 10);

    const [result] = await pool.promise().query(`
      INSERT INTO users (
        name,
        company,
        contact_phone,
        email,
        password,
        role,
        status,
        plan_id,
        credits_available,
        credits_used,
        channels_enabled
      ) VALUES (?, ?, ?, ?, ?, 'user', ?, ?, ?, 0, ?)
    `, [
      name,
      company_name,
      contact_phone,
      email,
      hash,
      status,
      plan_id,
      credits_available,
      JSON.stringify(channels_enabled)
    ]);

    res.status(201).json({
      success: true,
      id: result.insertId
    });
  } catch (err) {
    console.error('ADD CLIENT ERROR:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* =====================================================
   🔄 SUPER ADMIN — UPDATE CLIENT
===================================================== */
app.put('/api/clients/:id', async (req, res) => {
  const clientId = req.params.id;
  const {
    name,
    company_name,
    contact_phone,
    email,
    password,
    plan_id,
    status,
    credits_available,
    channels_enabled
  } = req.body;

  const fields = [];
  const values = [];

  if (name !== undefined) {
    fields.push('name = ?');
    values.push(name);
  }
  if (company_name !== undefined) {
    fields.push('company = ?');
    values.push(company_name);
  }
  if (contact_phone !== undefined) {
    fields.push('contact_phone = ?');
    values.push(contact_phone);
  }
  if (email !== undefined) {
    fields.push('email = ?');
    values.push(email);
  }
  if (plan_id !== undefined) {
    fields.push('plan_id = ?');
    values.push(plan_id);
  }
  if (status !== undefined) {
    fields.push('status = ?');
    values.push(status);
  }
  if (credits_available !== undefined) {
    fields.push('credits_available = ?');
    values.push(credits_available);
  }
  if (channels_enabled !== undefined) {
    fields.push('channels_enabled = ?');
    values.push(JSON.stringify(channels_enabled));
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
    const query = `UPDATE users SET ${fields.join(', ')} WHERE id = ? AND role = "user"`;
    values.push(clientId);
    const [result] = await pool.promise().query(query, values);

    if (!result.affectedRows)
      return res.status(404).json({ success: false, message: 'Client not found' });

    res.json({ success: true });
  } catch (err) {
    console.error('UPDATE CLIENT ERROR:', err.message);
    res.status(500).json({ success: false });
  }
});

/* =====================================================
   ❌ SUPER ADMIN — DELETE CLIENT
===================================================== */
app.delete('/api/clients/:id', async (req, res) => {
  const clientId = req.params.id;

  try {
    const [result] = await pool.promise().query(
      'DELETE FROM users WHERE id = ? AND role = "user"',
      [clientId]
    );

    if (!result.affectedRows)
      return res.status(404).json({ success: false, message: 'Client not found' });

    res.json({ success: true, message: 'Client deleted successfully' });
  } catch (err) {
    console.error('DELETE CLIENT ERROR:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* =====================================================
   💳 SUPER ADMIN — GET WALLET TRANSACTIONS
===================================================== */
app.get('/api/wallet/transactions', async (req, res) => {
  try {
    const [rows] = await pool.promise().query(`
      SELECT 
        t.id,
        t.type,
        t.amount,
        t.credits,
        t.description,
        t.status,
        t.created_at,
        u.name AS client_name
      FROM transactions t
      LEFT JOIN users u ON t.user_id = u.id
      ORDER BY t.created_at DESC
    `);
    res.json({ success: true, transactions: rows });
  } catch (err) {
    console.error('TRANSACTIONS ERROR:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* =====================================================
   🔄 SUPER ADMIN — ADJUST CREDITS (ADD/REFUND)
===================================================== */
app.post('/api/wallet/adjust', async (req, res) => {
  const { user_id, type, credits, description } = req.body;

  if (!user_id || !type || !credits || !description) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  if (!['adjustment', 'refund'].includes(type)) {
    return res.status(400).json({ success: false, message: 'Invalid type' });
  }

  try {
    // Update user's credits
    await pool.promise().query(`
      UPDATE users 
      SET credits_available = credits_available + ?
      WHERE id = ? AND role = 'user'
    `, [credits, user_id]);

    // Log transaction
    const [result] = await pool.promise().query(`
      INSERT INTO transactions (
        user_id,
        type,
        amount,
        credits,
        description,
        status
      ) VALUES (?, ?, 0, ?, ?, 'completed')
    `, [user_id, type, credits, description]);

    res.json({ success: true, id: result.insertId });
  } catch (err) {
    console.error('ADJUST CREDITS ERROR:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});


// Add these endpoints to your existing server.js (after the clients endpoints)

// =====================================================
// 👥 SUPER ADMIN — GET RESELLERS
// =====================================================
app.get('/api/resellers', async (req, res) => {
  try {
    const [rows] = await pool.promise().query(`
      SELECT 
        id,
        name,
        email,
        phone,
        domain,
        api_base_url,
        commission_percent,
        status,
        revenue_generated,
        clients_managed,
        payout_pending,
        created_at
      FROM resellers
      ORDER BY created_at DESC
    `);

    res.json({ success: true, resellers: rows });
  } catch (err) {
    console.error('GET RESELLERS ERROR:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch resellers' });
  }
});

// =====================================================
// ➕ SUPER ADMIN — ADD RESELLER
// =====================================================
app.post('/api/resellers', async (req, res) => {
  const {
    name,
    email,
    phone = null,
    domain = null,
    api_base_url = null,
    commission_percent = 10,
    status = 'active'
  } = req.body;

  if (!name || !email) {
    return res.status(400).json({ success: false, message: 'Name and email are required' });
  }

  try {
    // Check if email already exists
    const [exists] = await pool.promise().query(
      'SELECT id FROM resellers WHERE email = ?',
      [email]
    );

    if (exists.length) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    const [result] = await pool.promise().query(`
      INSERT INTO resellers (
        name, email, phone, domain, api_base_url, 
        commission_percent, status, 
        revenue_generated, clients_managed, payout_pending
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 0)
    `, [
      name, email, phone, domain, api_base_url,
      commission_percent, status
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

// =====================================================
// 🔄 SUPER ADMIN — UPDATE RESELLER (optional, for edit later)
// =====================================================
app.put('/api/resellers/:id', async (req, res) => {
  const resellerId = req.params.id;
  const {
    name, email, phone, domain, api_base_url,
    commission_percent, status
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

  if (!fields.length) {
    return res.status(400).json({ success: false, message: 'No fields to update' });
  }

  try {
    const query = `UPDATE resellers SET ${fields.join(', ')} WHERE id = ?`;
    values.push(resellerId);

    const [result] = await pool.promise().query(query, values);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Reseller not found' });
    }

    res.json({ success: true, message: 'Reseller updated' });
  } catch (err) {
    console.error('UPDATE RESELLER ERROR:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});


/* ======================
   ❌ 404 — ALWAYS LAST
====================== */
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

/* ======================
   START SERVER
====================== */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});