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
   🔄 SUPER ADMIN — UPDATE STATUS
===================================================== */
app.put('/api/clients/:id', async (req, res) => {
  const { status } = req.body;

  if (!['active', 'suspended'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status' });
  }

  try {
    const [result] = await pool.promise().query(
      'UPDATE users SET status = ? WHERE id = ? AND role = "user"',
      [status, req.params.id]
    );

    if (!result.affectedRows)
      return res.status(404).json({ success: false, message: 'Client not found' });

    res.json({ success: true });
  } catch (err) {
    console.error('UPDATE STATUS ERROR:', err.message);
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
