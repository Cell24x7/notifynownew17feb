const express = require('express');
require('dotenv').config();
const { query } = require('../config/db');
const { deductCampaignCredits } = require('../services/walletService');
const { getExternalTemplates } = require('../services/rcsService');

const router = express.Router();

const authenticate = require('../middleware/authMiddleware');

const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } }); // 100MB limit for rich media

// Get all RCS campaigns
router.get('/', authenticate, async (req, res) => {
    res.status(200).json({ success: true, message: 'RCS Route Alive' });
});

/**
 * @route GET /api/rcs/templates/external
 * @desc Get list of external templates (Now returns Dotgo hardcoded template)
 */
router.get('/templates/external', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch user's assigned RCS config to get the full credentials
    const [configs] = await query(`
      SELECT rc.* 
      FROM users u 
      JOIN rcs_configs rc ON u.rcs_config_id = rc.id 
      WHERE u.id = ?
    `, [userId]);

    if (!configs || configs.length === 0) {
      return res.json({ success: true, data: [], templates: [], message: 'No RCS configuration assigned' });
    }

    const config = configs[0];
    const templates = await getExternalTemplates(config);

    // Filter templates to only show those belonging to the user's specific bot
    // Although getExternalTemplates(config) already uses bot_id, 
    // we ensure the response is strictly for this user.
    res.json({ success: true, data: templates, templates });
  } catch (error) {
    console.error('❌ Error in /templates/external:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch templates' });
  }
});

/**
 * @route POST /api/rcs/templates
 * @desc Create or Update an RCS template on Dotgo
 */
router.post('/templates', authenticate, upload.array('multimedia_files'), async (req, res) => {
  try {
    const userId = req.user.id;

    // If it's multipart, req.body might need parsing or accessing directly
    // Multer populates req.body and req.files
    let templateData = { ...req.body };

    // Sometimes frontend sends rich_template_data as a string in FormData
    if (typeof req.body.rich_template_data === 'string') {
      try {
        const parsed = JSON.parse(req.body.rich_template_data);
        templateData = { ...templateData, ...parsed };
      } catch (e) {
        console.error('Error parsing rich_template_data string:', e);
      }
    }

    // Fetch user's assigned RCS config
    const [configs] = await query(`
      SELECT rc.* 
      FROM users u 
      JOIN rcs_configs rc ON u.rcs_config_id = rc.id 
      WHERE u.id = ?
    `, [userId]);

    if (!configs || configs.length === 0) {
      return res.status(400).json({ success: false, message: 'No RCS configuration assigned to your account' });
    }

    const config = configs[0];
    const { submitDotgoTemplate } = require('../services/rcsService');
    const originalName = req.query.originalName;

    // Pass config, data, uploaded files, and originalName
    const result = await submitDotgoTemplate(config, templateData, req.files || [], originalName);

    if (result.success) {
      res.json({ success: true, data: result.data });
    } else {
      res.status(500).json({ success: false, error: result.error, message: result.error });
    }
  } catch (error) {
    console.error('❌ Error in POST /templates:', error.message);
    res.status(500).json({ success: false, message: 'Failed to process template request' });
  }
});

/**
 * @route GET /api/rcs/templates/:name/status
 * @desc Sync/Fetch RCS template status from Dotgo
 */
router.get('/templates/:name/status', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const templateName = req.params.name;

    // Fetch user's assigned RCS config
    const [configs] = await query(`
      SELECT rc.* 
      FROM users u 
      JOIN rcs_configs rc ON u.rcs_config_id = rc.id 
      WHERE u.id = ?
    `, [userId]);

    if (!configs || configs.length === 0) {
      return res.status(400).json({ success: false, message: 'No RCS configuration assigned' });
    }

    const config = configs[0];
    const { getDotgoTemplateStatus } = require('../services/rcsService');
    const result = await getDotgoTemplateStatus(config, templateName);

    if (result.success) {
      res.json({ success: true, status: result.status });
    } else {
      res.status(500).json({ success: false, message: result.error });
    }
  } catch (error) {
    console.error('❌ Error in GET /templates/:name/status:', error.message);
    res.status(500).json({ success: false, message: 'Failed to sync template status' });
  }
});

/**
 * @route GET /api/rcs/reports
 * @desc Get aggregated RCS reports
 */
router.get('/reports', authenticate, async (req, res) => {
  try {
    const { startDate, endDate, status, channel } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    let tableName = 'campaigns';
    if (req.query.source === 'api') {
      tableName = 'api_campaigns';
    }

    let sql = `
      FROM ${tableName} c
      WHERE 1=1
    `;
    const params = [];

    if (channel && channel !== 'all') {
      sql += ` AND c.channel = ?`;
      params.push(channel);
    }

    // Filter by userId. If provided and user is admin, use targetUserId.
    // Otherwise, use authenticated userId for non-admins.
    const isAdminRole = req.user.role === 'superadmin' || req.user.role === 'admin';
    const isResellerRole = req.user.role === 'reseller';
    const userIdQuery = req.query.userId;

    if (isAdminRole) {
      if (userIdQuery && userIdQuery !== 'all') {
        sql += ` AND c.user_id = ?`;
        params.push(userIdQuery);
      }
    } else if (isResellerRole) {
      if (userIdQuery && userIdQuery !== 'all') {
        // Safety: Can only see if they are a client of this reseller
        const actualResellerId = req.user.actual_reseller_id || req.user.id;
        sql += ` AND (c.user_id = ? AND c.user_id IN (SELECT id FROM users WHERE reseller_id = ?))`;
        params.push(userIdQuery, actualResellerId);
      } else {
        // Reseller sees themselves + all their clients
        const actualResellerId = req.user.actual_reseller_id || req.user.id;
        sql += ` AND (c.user_id = ? OR c.user_id IN (SELECT id FROM users WHERE reseller_id = ?))`;
        params.push(req.user.id, actualResellerId);
      }
    } else {
      // Regular user sees only their own
      sql += ` AND c.user_id = ?`;
      params.push(req.user.id);
    }

    if (startDate && endDate) {
      sql += ` AND c.created_at BETWEEN ? AND ?`;
      params.push(startDate, endDate);
    }

    if (status && status !== 'all') {
      sql += ` AND c.status = ?`;
      params.push(status);
    }

    if (req.query.search) {
      sql += ` AND (c.name LIKE ? OR c.template_id LIKE ?)`;
      params.push(`%${req.query.search}%`, `%${req.query.search}%`);
    }

    // Get total count for pagination
    const countSql = `SELECT COUNT(*) as total ${sql}`;
    const [countResult] = await query(countSql, params);
    const total = countResult[0].total;

    // Get data (Paginated or Full Export)
    const isExport = req.query.export === 'true';
    let finalSql = `
      SELECT 
        c.id, c.name, c.template_id, c.template_name, c.created_at, c.channel,
        c.recipient_count, c.sent_count, c.delivered_count, c.read_count, c.failed_count, c.status
      ${sql}
      ORDER BY c.created_at DESC
    `;

    let reports;
    if (isExport) {
      [reports] = await query(finalSql, params);
    } else {
      finalSql += ` LIMIT ? OFFSET ?`;
      [reports] = await query(finalSql, [...params, limit, offset]);
    }

    res.json({
      success: true,
      reports,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('❌ Reports error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch reports' });
  }
});

/**
 * @route POST /api/rcs/send-campaign
 * @desc Send RCS Campaign (Using Dotgo)
 */
router.post('/send-campaign', authenticate, async (req, res) => {
  try {
    const { campaignName, contacts, templateName } = req.body;
    const userId = req.user.id;
    let campaignId = req.body.campaignId;

    // Use provided Dotgo template name or fetch from DB if campaignId exists
    let finalTemplate = templateName;
    let templateType = 'standard';

    if (!finalTemplate && campaignId) {
      const [campaigns] = await query('SELECT template_id, template_name, template_type FROM campaigns WHERE id = ?', [campaignId]);
      if (campaigns && campaigns.length > 0) {
        finalTemplate = campaigns[0].template_name || campaigns[0].template_id;
        templateType = campaigns[0].template_type || 'standard';
      }
    }

    // Try to get template type from message_templates if we have finalTemplate
    if (finalTemplate) {
      const [templates] = await query('SELECT template_type FROM message_templates WHERE id = ? OR name = ?', [finalTemplate, finalTemplate]);
      if (templates && templates.length > 0) {
        templateType = templates[0].template_type || 'standard';
      }
    }

    if (!finalTemplate) {
      return res.status(400).json({ success: false, message: 'Template name is required' });
    }

    // 1. If contacts provided, queue them
    if (contacts && contacts.length > 0) {

      // If no campaignId, create a new campaign record
      if (!campaignId) {
        campaignId = `CAMP${Date.now()}`;
        await query(
          `INSERT INTO campaigns (id, user_id, name, channel, template_id, template_name, template_type, recipient_count, sent_count, failed_count, status, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 'running', NOW())`,
          [
            campaignId,
            userId,
            campaignName,
            'RCS',
            finalTemplate,
            finalTemplate,
            templateType,
            contacts.length
          ]
        );
        console.log(`✅ Created new Dotgo campaign ${campaignId} for ${contacts.length} contacts (Type: ${templateType})`);
      } else {
        await query('UPDATE campaigns SET recipient_count = recipient_count + ?, template_type = ?, status = "running" WHERE id = ?', [contacts.length, templateType, campaignId]);
      }

      // Prepare queue items
      const values = contacts.map(c => {
        const mobile = typeof c === 'object' ? (c.mobile || c.phone) : c;
        if (!mobile) return null;
        const cleanMobile = mobile.replace(/\D/g, '');
        return [campaignId, userId, cleanMobile, 'pending'];
      }).filter(Boolean);

      if (values.length > 0) {
        // SUPER-FAST INGESTION: Bulk insert with high throughput
        const BATCH_SIZE = 5000;
        for (let i = 0; i < values.length; i += BATCH_SIZE) {
          const batch = values.slice(i, i + BATCH_SIZE).map(v => [...v, 'rcs']);
          await query('INSERT INTO campaign_queue (campaign_id, user_id, mobile, status, channel) VALUES ?', [batch]);
        }
        console.log(`🚀 [SuperFast] Ingested ${values.length} contacts for Dotgo campaign ${campaignId}`);
      }

    } else if (!campaignId) {
      return res.status(400).json({ success: false, message: 'No contacts provided and no campaign ID' });
    }


    // 2. Ensuring campaign is set to running
    if (campaignId) {
      await query('UPDATE campaigns SET status = "running" WHERE id = ? AND user_id = ?', [campaignId, userId]);

      // Deduct credits upfront
      const deductionResult = await deductCampaignCredits(campaignId);

      if (!deductionResult.success) {
        console.error(`❌ Credit deduction failed for campaign ${campaignId}: ${deductionResult.message}`);
        // Update campaign status to failed if deduction fails
        await query('UPDATE campaigns SET status = "failed" WHERE id = ?', [campaignId]);
        return res.status(402).json({
          success: false,
          message: deductionResult.message || 'Insufficient wallet balance'
        });
      }

      // Trigger Queue processing IMMEDIATELY instead of waiting for 15s loop
      const { processQueue } = require('../services/queueService');
      processQueue().catch(err => console.error('RCS Queue Trigger Error:', err.message));

      return res.json({
        success: true,
        message: 'Campaign processing started via Dotgo',
        campaignId,
        queued: contacts ? contacts.length : 0
      });
    }

    return res.status(500).json({ success: false, message: 'Unexpected flow error' });

  } catch (error) {
    console.error('❌ Campaign send error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to send campaign'
    });
  }
});

/**
 * @route GET /api/rcs/templates/external/:name/sync
 * @desc Get details from Dotgo and save/update in local DB
 */
router.get('/templates/external/:name/sync', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const templateName = req.params.name;

    const [configs] = await query(`
      SELECT rc.*, u.rcs_config_id
      FROM users u 
      JOIN rcs_configs rc ON u.rcs_config_id = rc.id 
      WHERE u.id = ?
    `, [userId]);

    if (!configs || configs.length === 0) {
      return res.status(400).json({ success: false, message: 'No RCS configuration assigned' });
    }

    const config = configs[0];
    const { getDotgoTemplateDetails } = require('../services/rcsService');
    const result = await getDotgoTemplateDetails(config, templateName);

    if (result.success && result.data) {
      const t = result.data;
      const type = t.templateType || t.type || 'text_message';
      let body = t.textMessageContent || t.fallbackText || '';
      const meta = {};

      if (type === 'rich_card' && t.standAlone) {
        body = t.standAlone.cardDescription || body;
        meta.cardTitle = t.standAlone.cardTitle;
        meta.mediaUrl = t.standAlone.mediaUrl;
        meta.orientation = t.orientation || 'VERTICAL';
        meta.height = t.height || 'SHORT_HEIGHT';
      } else if (type === 'carousel' && t.carouselList) {
        body = t.carouselList[0]?.cardDescription || body;
        meta.carouselList = t.carouselList.map(c => ({
          title: c.cardTitle,
          description: c.cardDescription,
          mediaUrl: c.mediaUrl
        }));
        meta.height = t.height || 'SHORT_HEIGHT';
        meta.width = t.width || 'MEDIUM_WIDTH';
      }

      // 1. Check if template exists locally
      const [existing] = await query('SELECT id FROM message_templates WHERE name = ? AND user_id = ? AND channel = "rcs"', [templateName, userId]);

      let localId;
      if (existing.length > 0) {
        localId = existing[0].id;
        await query(
          'UPDATE message_templates SET body = ?, template_type = ?, status = ?, metadata = ?, rcs_config_id = ? WHERE id = ?',
          [body, type, 'approved', JSON.stringify(meta), config.rcs_config_id, localId]
        );
      } else {
        localId = `TPL${Date.now()}`;
        await query(
          `INSERT INTO message_templates (id, user_id, name, channel, body, template_type, status, metadata, rcs_config_id, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [localId, userId, templateName, 'rcs', body, type, 'approved', JSON.stringify(meta), config.rcs_config_id]
        );
      }

      // 2. Sync Buttons (Suggestions)
      // Delete old buttons
      await query('DELETE FROM template_buttons WHERE template_id = ?', [localId]);

      // Map Dotgo suggestions to local button format
      const dotgoSuggestions = t.suggestions || t.standAlone?.suggestions || [];
      if (dotgoSuggestions.length > 0) {
        const btnValues = dotgoSuggestions.map((s, idx) => [
          `BTN${Date.now()}${idx}`,
          localId,
          s.suggestionType === 'reply' ? 'reply' : (s.suggestionType === 'url_action' ? 'url' : 'phone'),
          s.displayText,
          s.url || s.phoneNumber || s.postback || '',
          idx
        ]);
        await query('INSERT INTO template_buttons (id, template_id, type, label, value, position) VALUES ?', [btnValues]);
      }

      res.json({ success: true, message: 'Template successfully synced with local database', templateId: localId });
    } else {
      res.status(404).json({ success: false, message: result.error || 'Template not found on Dotgo' });
    }
  } catch (error) {
    console.error('❌ Sync template details error:', error.message);
    res.status(500).json({ success: false, message: 'Server error during sync' });
  }
});

router.delete('/templates/external/:name', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const templateName = req.params.name;

    // Fetch user's assigned RCS config
    const [configs] = await query(`
      SELECT rc.* 
      FROM users u 
      JOIN rcs_configs rc ON u.rcs_config_id = rc.id 
      WHERE u.id = ?
    `, [userId]);

    if (!configs || configs.length === 0) {
      return res.status(400).json({ success: false, message: 'No RCS configuration assigned' });
    }

    const { deleteDotgoTemplate } = require('../services/rcsService');
    const result = await deleteDotgoTemplate(configs[0], templateName);

    if (result.success) {
      res.json({ success: true, message: 'Template deleted from Dotgo' });
    } else {
      res.status(500).json({ success: false, message: result.error || 'Failed to delete template' });
    }
  } catch (error) {
    console.error('❌ Delete template error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * POST /api/rcs/api/send-bulk
 * RCS Bulk API: Similar to WhatsApp Bulk API
 */
router.post('/api/send-bulk', async (req, res) => {
    try {
        const { username, password, numbers, campaignName, templateName, variables } = req.body;

        if (!username || !password || !templateName || !numbers) {
            return res.status(400).json({ success: false, message: 'Missing required fields: username, password, templateName, numbers' });
        }

        // Auth
        const bcrypt = require('bcryptjs');
        const [users] = await query('SELECT * FROM users WHERE email = ?', [username]);
        
        if (!users.length) {
            return res.status(401).json({ success: false, message: 'Invalid API credentials: User not found' });
        }
        
        if (!users[0].api_password) {
            return res.status(401).json({ success: false, message: 'Invalid API credentials: API Password not set' });
        }

        if (!(await bcrypt.compare(password, users[0].api_password))) {
            return res.status(401).json({ success: false, message: 'Invalid API credentials: Password mismatch' });
        }

        const user = users[0];
        const userId = user.id;

        // Fetch Template
        const [temps] = await query('SELECT * FROM message_templates WHERE name = ? AND user_id = ? AND channel = "rcs"', [templateName, userId]);
        const template = temps[0];

        // Parse numbers
        let contacts = [];
        if (typeof numbers === 'string') contacts = numbers.split(',').map(n => ({ to: n.trim() }));
        else if (Array.isArray(numbers)) contacts = numbers.map(n => typeof n === 'string' ? { to: n } : n);
        contacts = contacts.filter(c => c.to);

        const cName = campaignName || `RCS_BULK_API_${Date.now()}`;
        const campaignId = `CAMP_API_${Date.now()}`;

        // Create Campaign initially as checking_credits in api_campaigns
        await query(
            `INSERT INTO api_campaigns (id, user_id, name, channel, template_id, template_name, template_type, recipient_count, audience_count, status, template_metadata, template_body)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'checking_credits', ?, ?)`,
            [
                campaignId, userId, cName, 'RCS', templateName, templateName, 
                template?.template_type || 'standard', contacts.length, contacts.length, 
                template?.metadata, template?.body
            ]
        );

        // Perform Credit Check
        const { deductCampaignCredits } = require('../services/walletService');
        const deductionResult = await deductCampaignCredits(campaignId, 'api_campaigns');
        
        if (!deductionResult.success) {
            console.warn(`[RCS Bulk API] Insufficient credits for user ${userId}. Campaign: ${campaignId}`);
            await query('UPDATE api_campaigns SET status = "paused" WHERE id = ?', [campaignId]);
            return res.status(402).json({ 
                success: false, 
                message: deductionResult.message || 'Insufficient wallet balance' 
            });
        }

        // Only insert into queue after successful deduction
        const queueValues = contacts.map(c => {
            const vars = { ...(variables || {}), ...(c.variables || {}) };
            return [campaignId, userId, c.to.replace(/\D/g, ''), 'pending', JSON.stringify(vars)];
        });

        const BATCH = 1000;
        for (let i = 0; i < queueValues.length; i += BATCH) {
            await query('INSERT INTO api_campaign_queue (campaign_id, user_id, mobile, status, variables) VALUES ?', [queueValues.slice(i, i + BATCH)]);
        }

        // Mark as running in api_campaigns
        await query('UPDATE api_campaigns SET status = "running" WHERE id = ?', [campaignId]);

        res.json({ success: true, campaignId, queued: contacts.length });
    } catch (error) {
        console.error('❌ RCS API Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/rcs/api/send-single
 * RCS Single API: Similar to WhatsApp Single API
 */
router.post('/api/send-single', async (req, res) => {
    try {
        const { username, password, to, templateName, params } = req.body;

        if (!username || !password || !templateName || !to) {
            return res.status(400).json({ success: false, message: 'Missing fields: username, password, templateName, to' });
        }

        // Auth
        const bcrypt = require('bcryptjs');
        const [users] = await query('SELECT * FROM users WHERE email = ?', [username]);
        if (!users.length || !users[0].api_password) return res.status(401).json({ success: false, message: 'Invalid credentials' });
        if (!(await bcrypt.compare(password, users[0].api_password))) return res.status(401).json({ success: false, message: 'Invalid credentials' });

        const user = users[0];
        
        // Fetch user's assigned RCS config
        const [configs] = await query(`
            SELECT rc.* 
            FROM users u 
            JOIN rcs_configs rc ON u.rcs_config_id = rc.id 
            WHERE u.id = ?
        `, [user.id]);

        if (!configs || configs.length === 0) {
            return res.status(400).json({ success: false, message: 'RCS not configured for this user' });
        }

        const { sendRcsTemplate } = require('../services/rcsService');
        const { deductSingleMessageCredit } = require('../services/walletService');
        
        // Check credit first
        const deduction = await deductSingleMessageCredit(user.id, 'rcs', templateName);
        if (!deduction.success) {
            return res.status(402).json({ success: false, message: deduction.message || 'Insufficient wallet balance' });
        }

        const result = await sendRcsTemplate(to, templateName, configs[0], params);

        if (result.success) {
            const apiLogId = `LOG_API_${Date.now()}`;
            const apiCampaignId = `CAMP_API_RCS_${Date.now()}`;
            const apiCampaignName = `API Send (RCS)`;

            // Main Message Log (For Reports/API Logs) in api_message_logs
            await query(
                `INSERT INTO api_message_logs (user_id, recipient, channel, status, message_id, template_name, campaign_id, campaign_name, created_at, send_time)
                 VALUES (?, ?, 'RCS', 'sent', ?, ?, ?, ?, NOW(), NOW())`,
                [user.id, to, result.messageId, templateName, apiCampaignId, apiCampaignName]
            );

            // Webhook Log (For Chat visibility if needed)
            await query(
                `INSERT INTO webhook_logs (user_id, sender, recipient, message_content, status, type, message_id, campaign_id) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [user.id, 'API', to, `Template: ${templateName}`, 'sent', 'rcs', result.messageId, apiCampaignId]
            );
            
            res.json({ success: true, messageId: result.messageId, logId: apiLogId });
        } else {
            res.status(500).json({ success: false, error: result.error });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/rcs/api/status/:id
 * Public Status API for RCS
 */
router.get('/api/status/:id', async (req, res) => {
    try {
        const { username, password } = req.query;
        const id = req.params.id;

        if (!username || !password) return res.status(401).json({ success: false, message: 'Auth required' });

        const bcrypt = require('bcryptjs');
        const [users] = await query('SELECT * FROM users WHERE email = ?', [username]);
        if (!users.length || !(await bcrypt.compare(password, users[0].api_password))) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const userId = users[0].id;

        if (id.startsWith('CAMP_')) {
            const [camps] = await query(`
                SELECT * FROM (
                    SELECT id, name, status, recipient_count, audience_count, sent_count, failed_count, created_at FROM campaigns WHERE id = ? AND user_id = ?
                    UNION ALL
                    SELECT id, name, status, recipient_count, audience_count, sent_count, failed_count, created_at FROM api_campaigns WHERE id = ? AND user_id = ?
                ) as combined_camps
            `, [id, userId, id, userId]);
            if (camps.length) return res.json({ success: true, type: 'campaign', data: camps[0] });
        }

        const [logs] = await query(`
            SELECT * FROM (
                SELECT * FROM message_logs WHERE (message_id = ? OR id = ?) AND user_id = ?
                UNION ALL
                SELECT * FROM api_message_logs WHERE (message_id = ? OR id = ?) AND user_id = ?
            ) as combined_logs
        `, [id, id, userId, id, id, userId]);
        if (logs.length) return res.json({ success: true, type: 'message', data: logs[0] });

        res.status(404).json({ success: false, message: 'Record not found' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET & POST /api/rcs/send
 * Clean endpoint for External Developers (Alias for send-single)
 */
const handleRcsSend = async (req, res) => {
    try {
        const username = req.body.username || req.query.username;
        const password = req.body.password || req.query.password;
        const to = req.body.to || req.query.to;
        const templateName = req.body.templateName || req.query.templateName;
        let params = req.body.params || req.query.params;

        // If params are passed as a string in GET, try to parse or convert to array
        if (typeof params === 'string' && params.includes(',')) {
            params = params.split(',');
        } else if (params && !Array.isArray(params)) {
            params = [params];
        }

        if (!username || !password || !templateName || !to) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing fields: username, password, templateName, to',
                received: { username: !!username, password: !!password, templateName: !!templateName, to: !!to }
            });
        }

        // Auth
        const bcrypt = require('bcryptjs');
        const [users] = await query('SELECT * FROM users WHERE email = ?', [username]);
        if (!users.length || !users[0].api_password) return res.status(401).json({ success: false, message: 'Invalid credentials' });
        if (!(await bcrypt.compare(password, users[0].api_password))) return res.status(401).json({ success: false, message: 'Invalid credentials' });

        const user = users[0];
        
        // Fetch user's assigned RCS config
        const [configs] = await query(`
            SELECT rc.* 
            FROM users u 
            JOIN rcs_configs rc ON u.rcs_config_id = rc.id 
            WHERE u.id = ?
        `, [user.id]);

        if (!configs || configs.length === 0) {
            return res.status(400).json({ success: false, message: 'RCS not configured for this user' });
        }

        const { sendRcsTemplate } = require('../services/rcsService');
        const { deductSingleMessageCredit } = require('../services/walletService');
        
        // Check credit
        const deduction = await deductSingleMessageCredit(user.id, 'rcs', templateName);
        if (!deduction.success) {
            return res.status(402).json({ success: false, message: deduction.message || 'Insufficient wallet balance' });
        }

        const result = await sendRcsTemplate(to, templateName, configs[0], params || []);

        if (result.success) {
            const apiLogId = `LOG_API_${Date.now()}`;
            const apiCampaignId = `CAMP_API_RCS_${Date.now()}`;
            const apiCampaignName = `API Send (RCS)`;

            await query(
                `INSERT INTO api_message_logs (user_id, recipient, channel, status, message_id, template_name, campaign_id, campaign_name, created_at, send_time, message_content)
                 VALUES (?, ?, 'RCS', 'sent', ?, ?, ?, ?, NOW(), NOW(), ?)`,
                [user.id, to, result.messageId, templateName, apiCampaignId, apiCampaignName, `Template: ${templateName}`]
            );

            await query(
                `INSERT INTO webhook_logs (user_id, sender, recipient, message_content, status, type, message_id, campaign_id) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [user.id, 'API', to, `Template: ${templateName}`, 'sent', 'rcs', result.messageId, apiCampaignId]
            );
            
            res.json({ success: true, messageId: result.messageId, logId: apiLogId });
        } else {
            res.status(500).json({ success: false, error: result.error });
        }
/**
 * POST /api/rcs/templates/create
 * External API for Developers to create RCS templates
 */
const handleRcsTemplateCreate = async (req, res) => {
    try {
        const username = req.body.username || req.query.username;
        const password = req.body.password || req.query.password;
        
        // Template Details
        const name = req.body.name || req.query.name;
        const type = req.body.type || req.query.type || 'text_message'; // text_message, rich_card, carousel
        const body = req.body.body || req.body.textMessageContent || req.query.body;
        const buttons = req.body.buttons || req.body.suggestions || [];
        const mediaUrl = req.body.mediaUrl || req.query.mediaUrl;
        const cardTitle = req.body.cardTitle || req.query.cardTitle;
        const fallbackText = req.body.fallbackText || req.query.fallbackText;

        if (!username || !password || !name || (!body && type === 'text_message')) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing fields: username, password, name, body (for text_message)',
                received: { username: !!username, password: !!password, name: !!name, body: !!body }
            });
        }

        // Auth
        const bcrypt = require('bcryptjs');
        const [users] = await query('SELECT * FROM users WHERE email = ?', [username]);
        if (!users.length || !users[0].api_password) return res.status(401).json({ success: false, message: 'Invalid credentials' });
        if (!(await bcrypt.compare(password, users[0].api_password))) return res.status(401).json({ success: false, message: 'Invalid credentials' });

        const user = users[0];
        
        // Fetch user's assigned RCS config
        const [configs] = await query(`
            SELECT rc.* 
            FROM users u 
            JOIN rcs_configs rc ON u.rcs_config_id = rc.id 
            WHERE u.id = ?
        `, [user.id]);

        if (!configs || configs.length === 0) {
            return res.status(400).json({ success: false, message: 'RCS not configured for this user' });
        }

        const { submitDotgoTemplate } = require('../services/rcsService');
        
        // Prepare template data for submitDotgoTemplate
        const templateData = {
            name,
            type,
            body,
            buttons,
            fallbackText,
            cardTitle,
            mediaUrl,
            // Pass metadata if it's a rich card/carousel to match expectations
            metadata: {
                mediaUrl,
                cardTitle,
                cardDescription: body,
                buttons
            }
        };

        const result = await submitDotgoTemplate(configs[0], templateData, []);

        if (result.success) {
            // Also insert into local message_templates for visibility in UI
            const templateId = `TPL_API_${Date.now()}`;
            await query(
                `INSERT INTO message_templates 
                (id, user_id, rcs_config_id, name, channel, template_type, body, status, created_at)
                VALUES (?, ?, ?, ?, 'rcs', ?, ?, 'pending', NOW())`,
                [templateId, user.id, configs[0].id, name, type, body]
            );

            // Add buttons to local DB
            if (buttons && Array.isArray(buttons)) {
                for (let i = 0; i < buttons.length; i++) {
                    const btn = buttons[i];
                    await query(
                        `INSERT INTO template_buttons (id, template_id, type, label, value, position)
                        VALUES (?, ?, ?, ?, ?, ?)`,
                        [`BTN_API_${Date.now()}_${i}`, templateId, btn.type || 'reply', btn.displayText || btn.label, btn.postback || btn.value || btn.url || btn.phoneNumber, i]
                    );
                }
            }

            res.json({ success: true, message: 'Template created and submitted for approval', data: result.data });
        } else {
            res.status(500).json({ success: false, error: result.error });
        }
    } catch (error) {
        console.error('❌ RCS Template Create API Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
};

router.post('/templates/create', handleRcsTemplateCreate);

/**
 * GET & POST /api/rcs/send
 * Clean endpoint for External Developers (Alias for send-single)
 */
const handleRcsSend = async (req, res) => {
    try {
        const username = req.body.username || req.query.username;
        const password = req.body.password || req.query.password;
        const to = req.body.to || req.query.to;
        const templateName = req.body.templateName || req.query.templateName;
        let params = req.body.params || req.query.params;

        // If params are passed as a string in GET, try to parse or convert to array
        if (typeof params === 'string' && params.includes(',')) {
            params = params.split(',');
        } else if (params && !Array.isArray(params)) {
            params = [params];
        }

        if (!username || !password || !templateName || !to) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing fields: username, password, templateName, to',
                received: { username: !!username, password: !!password, templateName: !!templateName, to: !!to }
            });
        }

        // Auth
        const bcrypt = require('bcryptjs');
        const [users] = await query('SELECT * FROM users WHERE email = ?', [username]);
        if (!users.length || !users[0].api_password) return res.status(401).json({ success: false, message: 'Invalid credentials' });
        if (!(await bcrypt.compare(password, users[0].api_password))) return res.status(401).json({ success: false, message: 'Invalid credentials' });

        const user = users[0];
        
        // Fetch user's assigned RCS config
        const [configs] = await query(`
            SELECT rc.* 
            FROM users u 
            JOIN rcs_configs rc ON u.rcs_config_id = rc.id 
            WHERE u.id = ?
        `, [user.id]);

        if (!configs || configs.length === 0) {
            return res.status(400).json({ success: false, message: 'RCS not configured for this user' });
        }

        const { sendRcsTemplate } = require('../services/rcsService');
        const { deductSingleMessageCredit } = require('../services/walletService');
        
        // Check credit
        const deduction = await deductSingleMessageCredit(user.id, 'rcs', templateName);
        if (!deduction.success) {
            return res.status(402).json({ success: false, message: deduction.message || 'Insufficient wallet balance' });
        }

        const result = await sendRcsTemplate(to, templateName, configs[0], params || []);

        if (result.success) {
            const apiLogId = `LOG_API_${Date.now()}`;
            const apiCampaignId = `CAMP_API_RCS_${Date.now()}`;
            const apiCampaignName = `API Send (RCS)`;

            await query(
                `INSERT INTO api_message_logs (user_id, recipient, channel, status, message_id, template_name, campaign_id, campaign_name, created_at, send_time, message_content)
                 VALUES (?, ?, 'RCS', 'sent', ?, ?, ?, ?, NOW(), NOW(), ?)`,
                [user.id, to, result.messageId, templateName, apiCampaignId, apiCampaignName, `Template: ${templateName}`]
            );

            await query(
                `INSERT INTO webhook_logs (user_id, sender, recipient, message_content, status, type, message_id, campaign_id) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [user.id, 'API', to, `Template: ${templateName}`, 'sent', 'rcs', result.messageId, apiCampaignId]
            );
            
            res.json({ success: true, messageId: result.messageId, logId: apiLogId });
        } else {
            res.status(500).json({ success: false, error: result.error });
        }
    } catch (error) {
        console.error('❌ RCS Send API Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
};

router.get('/send', handleRcsSend);
router.post('/send', handleRcsSend);

module.exports = router;
