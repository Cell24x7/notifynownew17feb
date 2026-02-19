const express = require('express');
require('dotenv').config();
const { query } = require('../config/db');

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

// ? FIX: normalize provider response (status SUCCESS etc.)
const normalizeRcsResult = (result) => {
  if (!result) return { success: false, error: 'Empty provider response', raw: result };

  // If service returns { success: true }
  if (result.success === true) {
    return {
      success: true,
      messageId: result.messageId || result.data || result.id || null,
      raw: result
    };
  }

  // If provider returns { status: "SUCCESS", data: "..." }
  if (typeof result === 'object' && result.status) {
    const ok = String(result.status).toUpperCase() === 'SUCCESS';
    return {
      success: ok,
      messageId: ok ? (result.data || result.messageId || null) : null,
      error: ok ? null : (result.error || JSON.stringify(result)),
      raw: result
    };
  }

  // If service puts JSON string in result.error
  if (result.error && typeof result.error === 'string') {
    try {
      const parsed = JSON.parse(result.error);
      if (parsed && String(parsed.status).toUpperCase() === 'SUCCESS') {
        return { success: true, messageId: parsed.data || null, raw: result };
      }
      return { success: false, error: result.error, raw: result };
    } catch {
      const ok = result.error.toUpperCase().includes('SUCCESS');
      return { success: ok, messageId: null, error: ok ? null : result.error, raw: result };
    }
  }

  // If provider returns plain string
  if (typeof result === 'string') {
    const ok = result.toUpperCase().includes('SUCCESS');
    return { success: ok, messageId: null, error: ok ? null : result, raw: result };
  }

  return { success: false, error: result.error || 'Unknown error', raw: result };
};

// Get all bots for current user
router.get('/bots', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const [bots] = await query('SELECT * FROM rcs_bots WHERE user_id = ? ORDER BY created_at DESC', [userId]);
    res.json(bots);
  } catch (error) {
    console.error('Get bots error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get bot by ID
router.get('/bots/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const [bots] = await query('SELECT * FROM rcs_bots WHERE id = ? AND user_id = ?', [req.params.id, userId]);
    if (!bots.length) return res.status(404).json({ error: 'Bot not found' });

    const [contacts] = await query('SELECT * FROM rcs_bot_contacts WHERE bot_id = ?', [req.params.id]);
    const [media] = await query('SELECT * FROM rcs_bot_media WHERE bot_id = ?', [req.params.id]);

    res.json({ ...bots[0], contacts, media });
  } catch (error) {
    console.error('Get bot error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Create new RCS bot
router.post('/bots', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      bot_name,
      brand_name,
      short_description,
      brand_color,
      bot_logo_url,
      banner_image_url,
      terms_url,
      privacy_url,
      route_type,
      bot_type,
      message_type,
      billing_category,
      development_platform,
      webhook_url,
      callback_url,
      languages_supported,
      agree_all_carriers,
      contacts
    } = req.body;

    // Validate required fields
    if (!bot_name || !brand_name) {
      return res.status(400).json({ error: 'Bot name and brand name are required' });
    }

    // Generate unique bot ID
    const botId = `BOT${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

    // Insert into rcs_bots table
    await query(
      `INSERT INTO rcs_bots (
        id, user_id, bot_name, brand_name, short_description, bot_type, route_type,
        development_platform, message_type, billing_category, languages_supported,
        bot_logo_url, banner_image_url, brand_color, callback_url, webhook_url,
        privacy_url, terms_url, agree_all_carriers, contacts, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT', NOW(), NOW())`,
      [
        botId, userId, bot_name, brand_name, short_description || null, bot_type || 'DOMESTIC',
        route_type || 'DOMESTIC', development_platform || null, message_type || null,
        billing_category || null, languages_supported || null, bot_logo_url || null,
        banner_image_url || null, brand_color || null, callback_url || null, webhook_url || null,
        privacy_url || null, terms_url || null, agree_all_carriers || false,
        JSON.stringify(contacts || [])
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Bot created successfully',
      botId,
      status: 'DRAFT'
    });
  } catch (error) {
    console.error('Create bot error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Update bot configuration
router.put('/bots/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { bot_name, brand_name, short_description, brand_color, bot_logo_url, banner_image_url } = req.body;

    // Check if bot belongs to user
    const [bots] = await query('SELECT * FROM rcs_bots WHERE id = ? AND user_id = ?', [req.params.id, userId]);
    if (!bots.length) return res.status(404).json({ error: 'Bot not found' });

    // Only allow updates if status is DRAFT
    if (bots[0].status !== 'DRAFT') {
      return res.status(400).json({ error: 'Can only update bots in DRAFT status' });
    }

    await query(
      `UPDATE rcs_bots SET 
        bot_name = ?, brand_name = ?, short_description = ?, brand_color = ?,
        bot_logo_url = ?, banner_image_url = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
      [bot_name, brand_name, short_description, brand_color, bot_logo_url, banner_image_url, req.params.id, userId]
    );

    res.json({ success: true, message: 'Bot configuration updated successfully' });
  } catch (error) {
    console.error('Update bot error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Delete bot
router.delete('/bots/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Check if bot belongs to user
    const [bots] = await query('SELECT * FROM rcs_bots WHERE id = ? AND user_id = ?', [req.params.id, userId]);
    if (!bots.length) return res.status(404).json({ error: 'Bot not found' });

    // Only allow deletion if status is DRAFT
    if (bots[0].status !== 'DRAFT') {
      return res.status(400).json({ error: 'Can only delete bots in DRAFT status' });
    }

    await query('DELETE FROM rcs_bots WHERE id = ? AND user_id = ?', [req.params.id, userId]);
    res.json({ success: true, message: 'Bot deleted successfully' });
  } catch (error) {
    console.error('Delete bot error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Submit bot for approval
router.post('/bots/:id/submit', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const botId = req.params.id;

    const [bots] = await query('SELECT * FROM rcs_bots WHERE id = ? AND user_id = ?', [botId, userId]);
    if (!bots.length) return res.status(404).json({ error: 'Bot not found' });

    if (bots[0].status !== 'DRAFT') {
      return res.status(400).json({ error: 'Bot is already submitted or processed' });
    }

    const { createRbmBot } = require('../services/viRbmService');
    console.log(`?? Submitting Bot ${botId} to Vi RBM...`);

    let rbmBotId = null;

    try {
      const rbmResponse = await createRbmBot(bots[0]);
      console.log('? Vi RBM Submission Response:', rbmResponse);

      if (rbmResponse && rbmResponse.botId) rbmBotId = rbmResponse.botId;

    } catch (rbmError) {
      console.error('?? Failed to submit to Vi RBM:', rbmError.message || rbmError);
      return res.status(502).json({
        error: 'Failed to submit to Vi RBM. Please check your configuration.',
        details: rbmError.message || rbmError
      });
    }

    await query(
      'UPDATE rcs_bots SET status = ?, rbm_bot_id = ?, submitted_at = NOW() WHERE id = ?',
      ['SUBMITTED', rbmBotId, botId]
    );

    res.json({ success: true, message: 'Bot submitted for approval successfully' });
  } catch (error) {
    console.error('Submit bot error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Sync bot status from Vi RBM
router.post('/bots/:id/sync', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const botId = req.params.id;

    const [bots] = await query('SELECT * FROM rcs_bots WHERE id = ? AND user_id = ?', [botId, userId]);
    if (!bots.length) return res.status(404).json({ error: 'Bot not found' });

    const bot = bots[0];

    if (!bot.rbm_bot_id) {
      return res.status(400).json({ error: 'No RBM Bot ID found. Please submit the bot first.' });
    }

    const { getBotStatus } = require('../services/viRbmService');
    console.log(`?? Syncing status for Bot ${botId} (${bot.rbm_bot_id})...`);

    const rbmStatus = await getBotStatus(bot.rbm_bot_id);
    console.log('? Vi RBM Status:', rbmStatus);

    let localStatus = bot.status;

    if (rbmStatus === 'LAUNCHED' || rbmStatus === 'APPROVED') localStatus = 'ACTIVE';
    else if (rbmStatus === 'REJECTED' || rbmStatus === 'SUSPENDED') localStatus = 'REJECTED';
    else if (rbmStatus === 'PENDING') localStatus = 'SUBMITTED';

    if (localStatus !== bot.status) {
      await query('UPDATE rcs_bots SET status = ?, updated_at = NOW() WHERE id = ?', [localStatus, botId]);
      console.log(`? Bot status updated to ${localStatus}`);
    } else {
      console.log('?? Bot status remains unchanged');
    }

    res.json({
      success: true,
      status: localStatus,
      rbmStatus
    });

  } catch (error) {
    console.error('Sync bot error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route GET /api/rcs/templates/external
 * @desc Get list of external templates (Direct from Provider)
 * @access Private (recommend)
 */
router.get('/templates/external', authenticateToken, async (req, res) => {
  try {
    const { getExternalTemplates } = require('../services/rcsService');
    const templates = await getExternalTemplates(7);
    res.json({ success: true, templates });
  } catch (error) {
    console.error('? Error in /templates/external:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch templates' });
  }
});

/**
 * @route GET /api/rcs/reports
 * @desc Get aggregated RCS reports
 * @access Private
 */
router.get('/reports', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate, status } = req.query;

    let sql = `
      SELECT 
        c.id, c.name, c.template_id, c.created_at,
        c.recipient_count, c.sent_count, c.delivered_count, c.read_count, c.failed_count
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

    sql += ` ORDER BY c.created_at DESC`;

    const [reports] = await query(sql, params);
    res.json({ success: true, reports });

  } catch (error) {
    console.error('? Reports error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch reports' });
  }
});

/**
 * @route POST /api/rcs/send-campaign
 * @desc Send RCS Campaign
 * @access Private
 */
router.post('/send-campaign', authenticateToken, async (req, res) => {
  try {
    const { campaignName, contacts, scheduledTime, templateName } = req.body;
    const userId = req.user.id;


    // Allow starting an existing campaign by ID without other fields
    if (req.body.campaignId) {
      // Proceed to campaign start logic
    } else if (!campaignName || !contacts || contacts.length === 0 || !templateName) {
      return res.status(400).json({
        success: false,
        message: 'Campaign name, template name, and contacts are required'
      });
    }


    console.log(`?? Campaign: ${campaignName || req.body.campaignId}`);
    console.log(`?? Template: ${templateName || 'N/A'}`);
    console.log(`?? Recipients length: ${contacts ? contacts.length : 0}`);
    console.log(`? Scheduled: ${scheduledTime || 'Now'}`);

    const { getRcsToken, sendRcsTemplate, sendRcsMessage } = require('../services/rcsService');

    const sentMessages = [];
    const failedMessages = [];

    // Get RCS token
    let rcsToken = null;
    try {
      rcsToken = await getRcsToken();
    } catch (tokenErr) {
      console.error('? RCS token error:', tokenErr.message);
      // Proceeding even if token fails, background worker will retry
    }

    // IF contacts provided, send immediately (Legacy/Small batches)
    if (contacts && contacts.length > 0) {
      // ... (Original logic for immediate sending) ...
      // For brevity, keeping original logic or directing to queue?
      // Let's DIRECT TO QUEUE for consistency if > 0

      // However, user might expect immediate response. 
      // Best approach: If contacts < 50, send immediately. If > 50, queue them.

      if (contacts.length > 50) {
        // Bulk insert to queue
        const campaignId = `CAMP_${Date.now()}`;
        await query(
          `INSERT INTO campaigns (id, user_id, name, channel, template_id, recipient_count, sent_count, failed_count, status, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, 0, 0, 'running', NOW())`,
          [campaignId, userId, campaignName, 'RCS', templateName, contacts.length]
        );

        const values = contacts.map(c => {
          const mobile = typeof c === 'object' ? (c.mobile || c.phone) : c;
          return [campaignId, mobile, 'pending'];
        });

        // Batch insert 1000 at a time
        const BATCH = 1000;
        for (let i = 0; i < values.length; i += BATCH) {
          await query('INSERT INTO campaign_queue (campaign_id, mobile, status) VALUES ?', [values.slice(i, i + BATCH)]);
        }

        return res.json({ success: true, message: 'Campaign queued for background processing', campaignId });
      }
    }

    // NEW Handling: If validation generally passed but contacts empty, 
    // it triggers existing campaign if campaignId provided?
    // The current endpoint expects 'campaignName', 'contacts'.
    // We need a way to START an existing campaign that has queue items.

    // Let's check if there is a 'campaignId' in body.
    if (req.body.campaignId) {
      // Update status to running
      await query('UPDATE campaigns SET status = "running" WHERE id = ? AND user_id = ?', [req.body.campaignId, userId]);
      return res.json({ success: true, message: 'Campaign started', campaignId: req.body.campaignId });
    }


    // Send message to each contact ONLY if we are in immediate mode (contacts provided and small batch)
    if (contacts && contacts.length > 0 && contacts.length <= 50) {
      for (const contact of contacts) {
        try {
          let mobile = null;
          let name = 'Unknown';

          if (typeof contact === 'string') {
            mobile = contact;
          } else if (typeof contact === 'object' && contact) {
            mobile = contact.mobile || contact.phone;
            name = contact.name || 'Unknown';
          }

          if (!mobile) {
            failedMessages.push({ mobile: null, name, error: 'No mobile number provided' });
            continue;
          }

          console.log(`?? Sending to ${mobile}...`);

          let rawResult = null;

          try {
            rawResult = await sendRcsTemplate(mobile, templateName);
          } catch (templateErr) {
            console.warn(`?? Template send failed for ${mobile}, trying raw message`);
            rawResult = await sendRcsMessage(mobile, campaignName);
          }

          const normalized = normalizeRcsResult(rawResult);

          if (normalized.success) {
            sentMessages.push({
              mobile,
              name,
              templateId: templateName,
              sentAt: new Date(),
              messageId: normalized.messageId || 'N/A'
            });
            console.log(`? Sent to ${mobile}`);
          } else {
            failedMessages.push({
              mobile,
              name,
              error: normalized.error || 'Unknown error',
              raw: normalized.raw // keep for debug if needed
            });
            console.log(`? Failed for ${mobile}: ${normalized.error || 'Unknown error'}`);
          }

        } catch (error) {
          failedMessages.push({
            mobile: typeof contact === 'object' ? (contact.mobile || contact.phone || null) : contact,
            name: typeof contact === 'object' ? (contact.name || 'Unknown') : 'Unknown',
            error: error.message
          });
          console.error('? Error sending to contact:', error.message);
        }
      }
    }

    // Save campaign to database
    // Save campaign to database (ONLY if immediate sending happened)
    if (contacts && contacts.length > 0 && contacts.length <= 50) {
      try {
        const campaignId = `CAMP_${Date.now()}`;

        await query(
          `INSERT INTO campaigns (id, user_id, name, channel, template_id, recipient_count, sent_count, failed_count, status, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            campaignId,
            userId,
            campaignName,
            'RCS',
            templateName,
            contacts.length,
            sentMessages.length,
            failedMessages.length,
            'sent' // Mark as sent since it's immediate
          ]
        );

        // Insert into message_logs for detailed tracking
        if (sentMessages.length > 0) {
          const logValues = sentMessages.map(msg => [
            campaignId,
            msg.messageId,
            msg.mobile,
            'sent',
            msg.sentAt
          ]);

          await query(
            `INSERT INTO message_logs (campaign_id, message_id, recipient, status, created_at) VALUES ?`,
            [logValues]
          );
        }

        console.log(`? Campaign saved: ${campaignId}`);

        return res.json({
          success: true,
          campaignName,
          campaignId,
          totalContacts: contacts.length,
          sentMessages: sentMessages.length, // Only return counts
          failedMessages: failedMessages.length
        });

      } catch (dbErr) {
        console.error('? Database error:', dbErr.message);
        return res.status(500).json({
          success: false,
          message: 'Failed to save campaign to database'
        });
      }
    } else if (req.body.campaignId) {
      return res.json({ success: true, message: 'Campaign processing started', campaignId: req.body.campaignId });
    } else {
      return res.status(400).json({ success: false, message: 'No contacts provided and no campaign ID' });
    }

  } catch (error) {
    console.error('? Campaign send error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to send campaign'
    });
  }
});

module.exports = router;
