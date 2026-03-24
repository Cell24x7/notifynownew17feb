// ===============================
// UNIVERSAL PRODUCTION SERVER
// Works for: API Only + Fullstack
// ===============================

const path = require('path');
const dotenv = require('dotenv');

// Smart env loading: prioritizes .env.production on servers
const currentPath = __dirname;
let envFile = '.env';

if (currentPath.includes('notifynow.in') || process.env.NODE_ENV === 'production') {
    envFile = '.env.production';
}

dotenv.config({ path: path.join(__dirname, envFile) });

console.log('===================================');
console.log(`🌍 MODE: ${process.env.NODE_ENV || 'production'}`);
console.log(`📄 CONFIG: ${envFile}`);
console.log(`🗄️  DATABASE: ${process.env.DB_NAME}`);
console.log(`🔌 TARGET PORT: ${process.env.PORT}`);
console.log('===================================');

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

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

// Serve static files from uploads (Absolute Path)
const uploadsDir = path.join(__dirname, 'uploads');
if (!require('fs').existsSync(uploadsDir)) require('fs').mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

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
app.use('/api/sms-gateways', require('./routes/smsGateways'));
app.use('/api/affiliates', require('./routes/affiliates'));
app.use('/api/campaigns', require('./routes/campaigns'));
app.use('/api/queue-manager', require('./routes/queueManagement'));
app.use('/api/templates', require('./routes/templates'));
app.use('/api/dlt-templates', require('./routes/dltTemplates'));
app.use('/api/contacts', require('./routes/contacts'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/logs', require('./routes/logs'));
app.use('/api/webhooks', require('./routes/webhooks'));
app.use('/api/whatsapp', require('./routes/whatsapp'));
app.use('/api/whatsapp-configs', require('./routes/whatsappConfigs'));
app.use('/api/whatsapp-pinbot', require('./routes/whatsappPinbot'));
app.use('/api/chatflows', require('./routes/chatflows'));
app.use('/api/feedbacks', require('./routes/feedbacks'));
app.use('/api/sms-v1', require('./routes/smsApiV1'));
app.use('/api/automations', require('./routes/automations'));

// Developer Webhook Endpoint (Must have /api/ prefix for Nginx proxy pass)
app.use('/api/webhook', require('./routes/developerWebhooks'));

/* ==================================
   HEALTH & FRONTEND
================================== */
app.get('/api/health', (req, res) => {
  res.json({ success: true, timestamp: new Date().toISOString() });
});

// Diagnostic endpoint to check DB state
app.get('/api/debug-stats', async (req, res) => {
  const { query } = require('./config/db');
  try {
      const [userCount] = await query('SELECT COUNT(*) as count FROM users');
      const [campCount] = await query('SELECT COUNT(*) as count FROM campaigns');
      const [queueCount] = await query('SELECT COUNT(*) as count FROM campaign_queue');
      const [recentCamps] = await query('SELECT id, user_id, status, created_at, recipient_count, audience_count FROM campaigns ORDER BY created_at DESC LIMIT 10');
      
      res.json({
          success: true,
          env: process.env.NODE_ENV,
          db: process.env.DB_NAME,
          counts: {
              users: userCount[0].count,
              campaigns: campCount[0].count,
              queue: queueCount[0].count
          },
          recent_campaigns: recentCamps
      });
  } catch (err) {
      res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/check-system', (req, res) => {
  res.json({
      success: true,
      environment: process.env.NODE_ENV || 'production',
      database: process.env.DB_NAME,
      port: process.env.PORT,
      api_url: process.env.API_BASE_URL,
      server_path: __dirname
  });
});

// High-Volume Queue Processor (BullMQ 1Cr+ Engine)
// require('./queues/campaignWorker');

// Classic Queue Processor (Backup/SQL)
const { processQueue, processApiQueue } = require('./services/queueService');
const runQueue = async () => {
  try { 
    await processQueue(); 
    await processApiQueue();
  } catch (err) { console.error('Queue error:', err); }
  setTimeout(runQueue, 15000); // Slooooow down SQL queue, Redis takes the heat
};
runQueue();

// Auto-create chat_flows table if it doesn't exist
const { ensureChatFlowsTable } = require('./services/chatflowService');
const { ensureWhatsAppPricingColumns } = require('./services/pricingService');
const { ensureAutomationsTable } = require('./services/automationService');
const { ensureEnquiryColumns } = require('./services/enquiryService');
const { ensureFeedbacksTable } = require('./services/feedbackService');

ensureChatFlowsTable().catch(err => console.error('ChatFlow table init error:', err));
ensureWhatsAppPricingColumns().catch(err => console.error('Pricing columns init error:', err));
ensureAutomationsTable().catch(err => console.error('Automations table init error:', err));
ensureEnquiryColumns().catch(err => console.error('Enquiry columns init error:', err));
ensureFeedbacksTable().catch(err => console.error('Feedbacks table init error:', err));

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
