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
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.options('*', cors());

/* ==================================
   MIDDLEWARE
================================== */
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files from uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

/* ==================================
   START SERVER & SOCKET.IO
================================== */
const PORT = process.env.PORT || 5000;
const httpServer = app.listen(PORT, () => {
  console.log('===================================');
  console.log(`🚀 Server running on port ${PORT}`);
  console.log('===================================');
});

const { Server } = require('socket.io');
const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

// Attach io to req
app.use((req, res, next) => {
  req.io = io;
  next();
});

io.on('connection', (socket) => {
  console.log('🔌 Socket connected:', socket.id);
  socket.on('join', (userId) => {
    socket.join(`user_${userId}`);
    console.log(`👤 User ${userId} joined room`);
  });
});

/* ==================================
   API ROUTES
================================== */
app.use('/api/auth', require('./routes/auth'));
app.use('/api/chats', require('./routes/chats'));
app.use('/api/rcs', require('./routes/rcs'));
app.use('/api/rcs-configs', require('./routes/rcsConfigs'));
app.use('/api/bots', require('./routes/bots'));
app.use('/api/clients', require('./routes/clients'));
app.use('/api/wallet', require('./routes/wallet'));
app.use('/api/resellers', require('./routes/resellers'));
app.use('/api/plans', require('./routes/plans'));
app.use('/api/dashboard', require('./routes/stats'));
app.use('/api/vendors', require('./routes/vendors'));
app.use('/api/numbers', require('./routes/numbers'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/sms', require('./routes/sms'));
app.use('/api/affiliates', require('./routes/affiliates'));
app.use('/api/campaigns', require('./routes/campaigns'));
app.use('/api/templates', require('./routes/templates'));
app.use('/api/dlt-templates', require('./routes/dltTemplates'));
app.use('/api/contacts', require('./routes/contacts'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/logs', require('./routes/logs'));
app.use('/api/webhooks', require('./routes/webhooks'));
app.use('/api/whatsapp', require('./routes/whatsapp'));
app.use('/api/whatsapp-configs', require('./routes/whatsappConfigs'));
app.use('/api/whatsapp-pinbot', require('./routes/whatsappPinbot'));


/* ==================================
   HEALTH & FRONTEND
================================== */
app.get('/api/health', (req, res) => {
  res.json({ success: true, timestamp: new Date().toISOString() });
});

// Queue Processor
const { processQueue } = require('./services/queueService');
const runQueue = async () => {
  try { await processQueue(); } catch (err) { console.error('Queue error:', err); }
  setTimeout(runQueue, 1000);
};
runQueue();

// Serve frontend
const frontendPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendPath));
app.get('*', (req, res, next) => {
  if (req.originalUrl.startsWith('/api')) return next();
  res.sendFile(path.join(frontendPath, 'index.html'), (err) => {
    if (err) res.status(200).send("API Running. Frontend not built.");
  });
});

module.exports = app;
