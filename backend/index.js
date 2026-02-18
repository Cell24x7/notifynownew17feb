// ===============================
// UNIVERSAL PRODUCTION SERVER
// Works for: API Only + Fullstack
// ===============================

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

const app = express();

/* ==================================
   CORS CONFIG (SMART + SAFE)
================================== */

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:8080',
  'http://localhost:8081',
  'http://localhost:5000',
  'https://notifynow.in',
  'https://www.notifynow.in',
  'http://192.168.1.47:8080'
];

app.use(cors({
  origin: function (origin, callback) {

    // Allow requests with no origin (Postman, mobile apps)
    if (!origin) return callback(null, true);

    // Development Mode: Allow everything
    return callback(null, true);

    /*
    // Strict Production Mode (Enable later)
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
    */
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Handle Preflight properly
app.options('*', cors());


/* ==================================
   MIDDLEWARE
================================== */

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));


/* ==================================
   API ROUTES
================================== */

app.use('/api/auth', require('./routes/auth'));
app.use('/api/clients', require('./routes/clients'));
app.use('/api/wallet', require('./routes/wallet'));
app.use('/api/resellers', require('./routes/resellers'));
app.use('/api/plans', require('./routes/plans'));
app.use('/api/dashboard', require('./routes/stats'));
app.use('/api/vendors', require('./routes/vendors'));
app.use('/api/numbers', require('./routes/numbers'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/rcs', require('./routes/rcs'));
app.use('/api/sms', require('./routes/sms'));
app.use('/api/rcs-templates', require('./routes/rcs-templates'));
app.use('/api/affiliates', require('./routes/affiliates'));
app.use('/api/campaigns', require('./routes/campaigns'));
app.use('/api/templates', require('./routes/templates'));
app.use('/api/contacts', require('./routes/contacts'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/logs', require('./routes/logs'));
app.use('/api/webhooks', require('./routes/webhooks'));


/* ==================================
   HEALTH CHECK
================================== */

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running 🚀',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});


/* ==================================
   SERVE FRONTEND (OPTIONAL)
   If frontend/dist exists → serve it
================================== */

const frontendPath = path.join(__dirname, '../frontend/dist');

try {
  app.use(express.static(frontendPath));

  app.get('*', (req, res, next) => {
    if (req.originalUrl.startsWith('/api')) {
      return next(); // skip API routes
    }
    res.sendFile(path.join(frontendPath, 'index.html'));
  });

} catch (err) {
  console.log('No frontend build found. Running as API only.');
}


/* ==================================
   GLOBAL ERROR HANDLER
================================== */

app.use((err, req, res, next) => {

  console.error('ERROR:', err.message);

  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'CORS blocked this request'
    });
  }

  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});


/* ==================================
   404 HANDLER
================================== */

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
});


/* ==================================
   START SERVER
================================== */

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log('===================================');
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('===================================');
});
