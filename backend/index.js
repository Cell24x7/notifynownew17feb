// ===============================
// UNIVERSAL PRODUCTION SERVER
// Works for: API Only + Fullstack
// ===============================

const path = require('path');
const dotenv = require('dotenv');

// Direct Env loading: Strictly follow NODE_ENV set by PM2
// Direct Env loading: Strictly follow NODE_ENV
const currentPath = __dirname;
let envFile = '.env.production'; // Default to production for safety on server

// Auto-detect if we are on local Windows development machine
const isLocalWindows = currentPath.includes('C:') || currentPath.includes('Users') || currentPath.includes('\\');
if (isLocalWindows || process.env.NODE_ENV === 'development') {
    envFile = '.env';
}

// Ensure explicit environment override takes precedence if set
if (process.env.NODE_ENV === 'production') {
    envFile = '.env.production';
}

dotenv.config({ path: path.join(__dirname, envFile) });

/*
console.log('===================================');
console.log(`🌍 MODE: ${process.env.NODE_ENV || 'production'}`);
console.log(`📄 CONFIG: ${envFile}`);
console.log(`🗄️  DATABASE: ${process.env.DB_NAME}`);
console.log(`🔌 TARGET PORT: ${process.env.PORT}`);
console.log('===================================');
*/

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const app = express();

// Trust proxy to get real IP from Nginx
app.set('trust proxy', true);

/* ==================================
   GLOBAL LOGGING & CORS
================================== */
app.use((req, res, next) => {
    // console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.originalUrl} - IP: ${req.ip}`);
    next();
});

const corsOptions = {
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: '*', // Relax for troubleshooting
  exposedHeaders: '*'
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files from uploads (Code-Relative Path)
const uploadsDir = path.join(__dirname, 'uploads');
const supportUploadsDir = path.join(uploadsDir, 'support');

// Ensure directories exist
const fs = require('fs');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(supportUploadsDir)) fs.mkdirSync(supportUploadsDir, { recursive: true });

app.use('/api/uploads', express.static(uploadsDir));
app.use('/uploads', express.static(uploadsDir));



/* ==================================
   START SERVER & SOCKET.IO
================================== */
const { startMaintenanceService } = require('./services/maintenanceService');
startMaintenanceService();

const PORT = process.env.PORT || 5000;
const httpServer = app.listen(PORT, () => {
/*
  console.log('===================================');
  console.log(`🚀 Server running on port ${PORT}`);
  console.log('===================================');
*/
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
  // console.log('🔌 Socket connected:', socket.id);
  socket.on('join', (userId) => {
    socket.join(`user_${userId}`);
    // console.log(`👤 User ${userId} joined room`);
  });
});

// Disable caching for all API endpoints to prevent reverse proxies (Nginx, Cloudflare) and browsers from caching user-specific data
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
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
app.use('/api/voice', require('./routes/voice'));
app.use('/api/chatflows', require('./routes/chatflows'));
app.use('/api/feedbacks', require('./routes/feedbacks'));
app.use('/api/social', require('./routes/social'));
app.use('/api/sms-v1', require('./routes/smsApiV1'));
app.use('/api/automations', require('./routes/automations'));
app.use('/api/l', require('./routes/links'));
app.use('/api/shopify', require('./routes/shopify'));
app.use('/api/support', require('./routes/support'));
app.use('/api/knowledge', require('./routes/knowledge'));
app.use('/api/proero', require('./routes/proero'));
app.use('/api/wa-unofficial-v1', require('./routes/waUnofficialApiV1'));


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

app.get('/api/debug-automations-graph', async (req, res) => {
  const { query } = require('./config/db');
  try {
      const [rows] = await query("SELECT id, name, user_id, status, channel, nodes, edges FROM automations");
      const mapped = rows.map(r => ({
          id: r.id,
          name: r.name,
          user_id: r.user_id,
          status: r.status,
          channel: r.channel,
          nodes: typeof r.nodes === 'string' ? JSON.parse(r.nodes) : r.nodes,
          edges: typeof r.edges === 'string' ? JSON.parse(r.edges) : r.edges
      }));
      res.json({ success: true, automations: mapped });
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

app.get('/api/debug-logs', async (req, res, next) => {
    try {
        const { query } = require('./config/db');
        const [logs] = await query('SELECT * FROM message_logs ORDER BY id DESC LIMIT 50');
        const [apiLogs] = await query('SELECT * FROM api_message_logs ORDER BY id DESC LIMIT 50');
        const [campaigns] = await query('SELECT id, name, status, recipient_count, sent_count, failed_count FROM campaigns ORDER BY created_at DESC LIMIT 10');
        const [gateways] = await query('SELECT id, name, status, primary_url FROM sms_gateways');
        res.json({ 
            success: true, 
            message_logs: logs, 
            api_message_logs: apiLogs, 
            campaigns: campaigns, 
            sms_gateways: gateways,
            env: {
                API_BASE_URL: process.env.API_BASE_URL,
                DLR_BASE_URL: process.env.DLR_BASE_URL,
                NODE_ENV: process.env.NODE_ENV
            }
        });
    } catch (err) {
        next(err);
    }
});

// High-Volume Queue Processor (BullMQ 1Cr+ Engine)
require('./queues/campaignWorker');

// Classic Queue Processor (Backup/SQL)
const { processQueue, processApiQueue } = require('./services/queueService');
const runQueue = async () => {
  try { 
    await processQueue(); 
    await processApiQueue();
  } catch (err) { console.error('Queue error:', err); }
  setTimeout(runQueue, 5000); // 5s — fast enough to keep BullMQ full, safe for DB
};

const isFirstInstance = process.env.NODE_APP_INSTANCE === undefined || process.env.NODE_APP_INSTANCE === '0';
if (isFirstInstance) {
  runQueue();
} else {
  console.log(`ℹ️ [Queue Processor] Skipping ingestion loop on PM2 instance ${process.env.NODE_APP_INSTANCE} to prevent duplicate processing.`);
}

// Start Unofficial WhatsApp status polling service
const { startPolling } = require('./services/waUnofficialPollingService');
startPolling();

// Start Dinstar GSM Gateway DLR polling service
const dinstarPolling = require('./services/dinstarPollingService');
dinstarPolling.startPolling();

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
app.get('/api/temp-debug', async (req, res) => {
  try {
    const { query } = require('./config/db');
    const users = await query("SELECT id, name, email, role, status FROM users WHERE name LIKE '%Jredeems%' OR email LIKE '%Jredeems%'");
    const campaigns = await query("SELECT id, user_id, name, status, recipient_count, sent_count FROM campaigns WHERE name LIKE '%Jredeems%' OR user_id IN (SELECT id FROM users WHERE name LIKE '%Jredeems%')");
    const allCampaignsCount = await query("SELECT COUNT(*) as count FROM campaigns");
    const allUsersCount = await query("SELECT COUNT(*) as count FROM users");
    res.json({ success: true, users: users[0], campaigns: campaigns[0], allCampaignsCount: allCampaignsCount[0], allUsersCount: allUsersCount[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/turbo-diagnostics', async (req, res) => {
  const { execSync } = require('child_process');
  const fs = require('fs');
  const results = {};
  
  // 1. Run pm2 status
  try {
    results.pm2_status = execSync('pm2 status', { encoding: 'utf8', timeout: 3000 });
  } catch (err) {
    results.pm2_status = 'Error: ' + err.message;
  }
  
  // 2. Check PM2 logs directory
  try {
    const logDir = require('os').homedir() + '/.pm2/logs';
    if (fs.existsSync(logDir)) {
      const outLog = logDir + '/notifynow-live-prod-out.log';
      const errLog = logDir + '/notifynow-live-prod-error.log';
      
      const safeTail = (filePath) => {
        if (!fs.existsSync(filePath)) return 'File not found';
        try {
          return execSync(`tail -n 100 "${filePath}"`, { encoding: 'utf8', timeout: 2000 });
        } catch (e) {
          return 'Tail error: ' + e.message;
        }
      };
      
      results.out_log_tail = safeTail(outLog);
      results.err_log_tail = safeTail(errLog);
    } else {
      results.log_files = 'Dir not found: ' + logDir;
    }
  } catch (err) {
    results.log_files_error = err.message;
  }
  
  // 3. Redis / BullMQ check
  try {
    results.redis_ping = execSync('redis-cli ping', { encoding: 'utf8', timeout: 2000 }).trim();
    
    // Check active jobs in BullMQ
    const { redisConnection } = require('./queues/campaignQueue');
    const Redis = require('ioredis');
    const redis = new Redis({ ...redisConnection, maxRetriesPerRequest: 0, connectTimeout: 1000 });
    const envSuffix = (process.env.APP_NAME || 'notifynow').replace(/-developer|-production/g, '');
    const queueKey = `bull:campaign-sending-${envSuffix}`;
    const activeJobs = await redis.llen(`${queueKey}:active`).catch(() => 0);
    const waitJobs = await redis.llen(`${queueKey}:wait`).catch(() => 0);
    results.bullmq = { active: activeJobs, wait: waitJobs };

    // Inspect Redis stats and progress keys
    const statsKeys = await redis.keys(`${envSuffix}:stats:*`).catch(() => []);
    results.redis_stats = {};
    for (const key of statsKeys) {
      results.redis_stats[key] = await redis.hgetall(key).catch(() => ({}));
    }
    const progKeys = await redis.keys(`${envSuffix}:camp_progress:*`).catch(() => []);
    results.redis_progress = {};
    for (const key of progKeys) {
      results.redis_progress[key] = await redis.get(key).catch(() => null);
    }

    await redis.quit();
  } catch (err) {
    results.redis_error = err.message;
  }

  // 4. DB check and campaign status
  try {
    const { query } = require('./config/db');
    const [campaigns] = await query(`
        SELECT id, name, status, scheduled_at, next_run_at, recipient_count, sent_count, failed_count, channel 
        FROM campaigns 
        WHERE name LIKE '%05 Jun 2026%' OR status = 'running' OR status = 'scheduled'
        ORDER BY created_at DESC
        LIMIT 15
    `);
    results.campaigns = campaigns;
    
    if (campaigns.length > 0) {
      const campIds = campaigns.map(c => c.id);
      const [queueStats] = await query(`
          SELECT campaign_id, status, COUNT(*) as count 
          FROM campaign_queue 
          WHERE campaign_id IN (?)
          GROUP BY campaign_id, status
      `, [campIds]);
      results.campaign_queue_stats = queueStats;
    }
  } catch (err) {
    results.db_error = err.message;
  }
  
  res.json(results);
});

// API 404 handler — any unmatched /api/* route returns JSON not HTML
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, message: `API endpoint not found: ${req.method} ${req.originalUrl}` });
});

// Global JSON error handler — prevents Express from sending HTML error pages
app.use((err, req, res, next) => {
  console.error('❌ Global Error:', err.stack || err.message);
  const status = err.status || err.statusCode || 500;
  if (req.originalUrl.startsWith('/api')) {
    return res.status(status).json({ success: false, message: err.message || 'Internal Server Error' });
  }
  next(err);
});

// Short Link Redirector Catch-All
// Must be placed before the React frontend catch-all
app.use('/', (req, res, next) => {
    // Check if it's exactly an 8-character short code at the root path
    if (/^\/[A-Za-z0-9]{8}$/.test(req.path)) {
        return require('./routes/links')(req, res, next);
    }
    next();
});

// Serve frontend
const frontendPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendPath));
app.get('*', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(frontendPath, 'index.html'), (err) => {
    if (err) res.status(200).send("API Running. Frontend not built.");
  });
});

// End diagnostics route block

module.exports = app;
