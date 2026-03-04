const express = require('express');
require('dotenv').config();
const { query } = require('../config/db');
const { deductCampaignCredits } = require('../services/walletService');
const { getExternalTemplates } = require('../services/rcsService');

const router = express.Router();

// Middleware to authenticate token
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  const jwt = require('jsonwebtoken');
  jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey123', (err, decoded) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = decoded;
    next();
  });
};

const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } }); // 100MB limit for rich media

/**
 * @route GET /api/rcs/templates/external
 * @desc Get list of external templates (Now returns Dotgo hardcoded template)
 */
router.get('/templates/external', authenticateToken, async (req, res) => {
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
router.post('/templates', authenticateToken, upload.array('multimedia_files'), async (req, res) => {
  try {
    const userId = req.user.id;

    // If it's multipart, req.body might need parsing or accessing directly
    // Multer populates req.body and req.files
    let templateData = req.body;

    // Sometimes frontend sends rich_template_data as a string in FormData
    if (typeof templateData.rich_template_data === 'string') {
      try {
        templateData = JSON.parse(templateData.rich_template_data);
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
router.get('/templates/:name/status', authenticateToken, async (req, res) => {
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
router.get('/reports', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate, status } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    let sql = `
      FROM campaigns c
      WHERE c.user_id = ? AND c.channel = 'RCS'
    `;
    const params = [userId];

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

    // Get paginated data
    const selectSql = `
      SELECT 
        c.id, c.name, c.template_id, c.template_name, c.created_at,
        c.recipient_count, c.sent_count, c.delivered_count, c.read_count, c.failed_count, c.status
      ${sql}
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const [reports] = await query(selectSql, [...params, limit, offset]);

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
router.post('/send-campaign', authenticateToken, async (req, res) => {
  try {
    const { campaignName, contacts, templateName } = req.body;
    const userId = req.user.id;
    let campaignId = req.body.campaignId;

    // Use provided Dotgo template name or fetch from DB if campaignId exists
    let finalTemplate = templateName;

    if (!finalTemplate && campaignId) {
      const [campaigns] = await query('SELECT template_id FROM campaigns WHERE id = ?', [campaignId]);
      if (campaigns && campaigns.length > 0) {
        finalTemplate = campaigns[0].template_id;
      }
    }

    if (!finalTemplate) {
      return res.status(400).json({ success: false, message: 'Template name is required' });
    }

    // 1. If contacts provided, queue them
    if (contacts && contacts.length > 0) {

      // If no campaignId, create a new campaign record
      if (!campaignId) {
        campaignId = `CAMP_${Date.now()}`;
        await query(
          `INSERT INTO campaigns (id, user_id, name, channel, template_id, template_name, recipient_count, sent_count, failed_count, status, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 'running', NOW())`,
          [
            campaignId,
            userId,
            campaignName,
            'RCS',
            finalTemplate,
            finalTemplate,
            contacts.length
          ]
        );
        console.log(`✅ Created new Dotgo campaign ${campaignId} for ${contacts.length} contacts`);
      } else {
        await query('UPDATE campaigns SET recipient_count = recipient_count + ? WHERE id = ?', [contacts.length, campaignId]);
      }

      // Prepare queue items
      const values = contacts.map(c => {
        const mobile = typeof c === 'object' ? (c.mobile || c.phone) : c;
        if (!mobile) return null;
        const cleanMobile = mobile.replace(/\D/g, '');
        return [campaignId, cleanMobile, 'pending'];
      }).filter(Boolean);

      if (values.length > 0) {
        // Batch insert to queue
        const BATCH = 1000;
        for (let i = 0; i < values.length; i += BATCH) {
          await query('INSERT INTO campaign_queue (campaign_id, mobile, status) VALUES ?', [values.slice(i, i + BATCH)]);
        }
        console.log(`✅ Queued ${values.length} contacts for Dotgo campaign ${campaignId}`);
      }

    } else if (!campaignId) {
      return res.status(400).json({ success: false, message: 'No contacts provided and no campaign ID' });
    }


    // 2. Ensuring campaign is set to running
    if (campaignId) {
      await query('UPDATE campaigns SET status = "running" WHERE id = ? AND user_id = ?', [campaignId, userId]);

      // Deduct credits upfront
      await deductCampaignCredits(campaignId);

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
 * @route DELETE /api/rcs/templates/external/:name
 * @desc Delete an RCS template from Dotgo
 */
router.delete('/templates/external/:name', authenticateToken, async (req, res) => {
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

module.exports = router;

