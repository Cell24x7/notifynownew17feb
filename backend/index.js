// server.js (or index.js) - Main entry point
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan'); // optional: for request logging (very helpful for debugging)

const app = express();

// Middleware
app.use(morgan('dev')); // Logs every request (method, url, status, time) - remove in production if not needed
app.use(express.json({ limit: '10mb' })); // Increase limit if you handle large payloads
app.use(express.urlencoded({ extended: true }));

// CORS - allow only trusted origins
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',   // Vite default
    'http://localhost:8080',
    // Add your production frontend URL here later, e.g. 'https://yourdomain.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Routes
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
app.use('/api/rcs-templates', require('./routes/rcs-templates'));
app.use('/api/affiliates', require('./routes/affiliates'));

// Health check & root route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Backend server is running 🚀',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// Global error handler (very useful)
app.use((err, req, res, next) => {
  console.error('GLOBAL ERROR:', err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler - always last
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`CORS allowed origins: ${app.get('cors')?.origin || 'configured in cors()'}`);
});