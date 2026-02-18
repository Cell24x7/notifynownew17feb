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
    const [result] = await query(
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
    const { bot_name, brand_name, short_description, brand_color, bot_logo_url, banner_image_url, ...updateData } = req.body;

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
// Submit bot for approval
router.post('/bots/:id/submit', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const botId = req.params.id;

    // Check if bot belongs to user
    const [bots] = await query('SELECT * FROM rcs_bots WHERE id = ? AND user_id = ?', [botId, userId]);
    if (!bots.length) return res.status(404).json({ error: 'Bot not found' });

    // Only allow submission if status is DRAFT
    if (bots[0].status !== 'DRAFT') {
      return res.status(400).json({ error: 'Bot is already submitted or processed' });
    }

    // --- Vi RBM Integration ---
    const { createRbmBot } = require('../services/viRbmService');
    console.log(`🚀 Submitting Bot ${botId} to Vi RBM...`);

    let rbmStatus = 'SUBMITTED';
    let rbmBotId = null;

    try {
      const rbmResponse = await createRbmBot(bots[0]);
      console.log('✅ Vi RBM Submission Response:', rbmResponse);

      // Check what we got back. 
      // If we got a botId, save it.
      if (rbmResponse && rbmResponse.botId) {
        rbmBotId = rbmResponse.botId;
      }

      // If status is returned
      if (rbmResponse && rbmResponse.status) {
        // Map RBM status if needed, or just keep SUBMITTED
      }

    } catch (rbmError) {
      console.error('⚠️ Failed to submit to Vi RBM:', rbmError.message || rbmError);
      // We might want to fail the whole request or just log it?
      // User said "kya mera bot approval ke liye jata hai virbm ko ki nahi".
      // So we should probably try to enforce it, but if API fails, maybe keep it locally submitted?
      // Let's return error to user so they know.
      return res.status(502).json({
        error: 'Failed to submit to Vi RBM. Please check your configuration.',
        details: rbmError.message || rbmError
      });
    }

    // Update status to SUBMITTED and save RBM Bot ID
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

    // Check if bot belongs to user
    const [bots] = await query('SELECT * FROM rcs_bots WHERE id = ? AND user_id = ?', [botId, userId]);
    if (!bots.length) return res.status(404).json({ error: 'Bot not found' });

    const bot = bots[0];

    // Only verify if we have an RBM Bot ID or if it's in a submitted state
    // If we don't have an RBM Bot ID, we can try to "re-submit" or check by name if API supported it,
    // but typically we need the ID.
    if (!bot.rbm_bot_id) {
      // Fallback: If no RBM ID yet, maybe previous submission didn't return it.
      // We could try to "create" again to get the ID, or just tell user to submit first.
      return res.status(400).json({ error: 'No RBM Bot ID found. Please submit the bot first.' });
    }

    // --- Vi RBM Integration ---
    const { getBotStatus } = require('../services/viRbmService');
    console.log(`🔄 Syncing status for Bot ${botId} (${bot.rbm_bot_id})...`);

    const rbmStatus = await getBotStatus(bot.rbm_bot_id);
    console.log('✅ Vi RBM Status:', rbmStatus);

    // Map RBM status to local status
    let localStatus = bot.status;

    // Example mapping: 
    // RBM might return: LAUNCHED, PENDING, REJECTED, etc.
    if (rbmStatus === 'LAUNCHED' || rbmStatus === 'APPROVED') {
      localStatus = 'ACTIVE';
    } else if (rbmStatus === 'REJECTED' || rbmStatus === 'SUSPENDED') {
      localStatus = 'REJECTED'; // Or SUSPENDED
    } else if (rbmStatus === 'PENDING') {
      localStatus = 'SUBMITTED';
    }

    // Update DB
    if (localStatus !== bot.status) {
      await query('UPDATE rcs_bots SET status = ?, updated_at = NOW() WHERE id = ?', [localStatus, botId]);
      console.log(`✅ Bot status updated to ${localStatus}`);
    } else {
      console.log('ℹ️ Bot status remains unchanged');
    }

    res.json({
      success: true,
      status: localStatus,
      rbmStatus: rbmStatus
    });

  } catch (error) {
    console.error('Sync bot error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route GET /api/rcs/templates/external
 * @desc Get list of external templates (Direct from Provider)
 * @access Private
 */
router.get('/templates/external', authenticateToken, async (req, res) => {
  try {
    const { getExternalTemplates } = require('../services/rcsService');
    // Hardcoded custId=7 as per user request
    const templates = await getExternalTemplates(7);
    res.json({ success: true, templates });
  } catch (error) {
    console.error('❌ Error in /templates/external:', error.message);
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
      // For campaigns, status might be 'sent', 'completed', etc.
      // If user wants to filter by message status (e.g. "delivered"), it's trickier on campaign level.
      // Usually reports filter by campaign status or date.
      sql += ` AND c.status = ?`;
      params.push(status);
    }

    sql += ` ORDER BY c.created_at DESC`;

    const [reports] = await query(sql, params);
    res.json({ success: true, reports });

  } catch (error) {
    console.error('❌ Reports error:', error.message);
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
    // console.log('📤 POST /api/rcs/send-campaign');
    // Extract templateName from frontend request
    const { campaignName, contacts, scheduledTime, templateName } = req.body;
    const userId = req.user.id;

    // Use dynamic template name provided by user
    // const templateName = "Empowering_business"; 

    // Validation
    if (!campaignName || !contacts || contacts.length === 0 || !templateName) {
      return res.status(400).json({
        success: false,
        message: 'Campaign name, template name, and contacts are required'
      });
    }

    console.log(`📊 Campaign: ${campaignName}`);
    console.log(`📝 Template: ${templateName}`);
    console.log(`📞 Recipients: ${contacts.length}`);
    console.log(`⏰ Scheduled: ${scheduledTime || 'Now'}`);

    // Import RCS service
    const { getRcsToken, sendRcsTemplate, sendRcsMessage } = require('../services/rcsService');

    const sentMessages = [];
    const failedMessages = [];

    // Get RCS token
    let rcsToken = null;
    try {
      rcsToken = await getRcsToken();
      if (!rcsToken) {
        console.error('❌ Failed to get RCS token');
        return res.status(500).json({
          success: false,
          message: 'Failed to authenticate with RCS API'
        });
      }
      console.log('✅ RCS token obtained');
    } catch (tokenErr) {
      console.error('❌ RCS token error:', tokenErr.message);
      return res.status(500).json({
        success: false,
        message: 'RCS authentication failed'
      });
    }

    // Send message to each contact
    for (const contact of contacts) {
      try {
        let mobile = null;
        let name = 'Unknown';

        if (typeof contact === 'string') {
          mobile = contact;
        } else if (typeof contact === 'object') {
          mobile = contact.mobile || contact.phone;
          name = contact.name || 'Unknown';
        }

        if (!mobile) {
          failedMessages.push({
            contact: name,
            error: 'No mobile number provided'
          });
          continue;
        }

        console.log(`📱 Sending to ${mobile}...`);

        // Try sending template first
        let result = null;
        try {
          result = await sendRcsTemplate(mobile, templateName);
        } catch (templateErr) {
          console.warn(`⚠️ Template send failed for ${mobile}, trying raw message`);
          // Fallback to raw message
          try {
            result = await sendRcsMessage(mobile, campaignName);
          } catch (msgErr) {
            throw msgErr;
          }
        }

        if (result && result.success) {
          sentMessages.push({
            mobile,
            name,
            templateId: templateName,
            sentAt: new Date(),
            messageId: result.messageId || 'N/A'
          });
          console.log(`✅ Sent to ${mobile}`);
        } else {
          failedMessages.push({
            mobile,
            name,
            error: result?.error || 'Unknown error'
          });
          console.log(`❌ Failed for ${mobile}: ${result?.error || 'Unknown error'}`);
        }

      } catch (error) {
        failedMessages.push({
          contact: typeof contact === 'object' ? (contact.mobile || 'Unknown') : contact,
          error: error.message
        });
        console.error(`❌ Error sending to contact:`, error.message);
      }
    }

    // Save campaign to database
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
          'sent'
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

      console.log(`✅ Campaign saved: ${campaignId}`);

      return res.json({
        success: true,
        campaignName,
        campaignId,
        totalContacts: contacts.length,
        sentMessages: sentMessages.length,
        failedMessages: failedMessages.length,
        details: {
          sent: sentMessages,
          failed: failedMessages
        }
      });

    } catch (dbErr) {
      console.error('❌ Database error:', dbErr.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to save campaign to database'
      });
    }

  } catch (error) {
    console.error('❌ Campaign send error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to send campaign'
    });
  }
});

module.exports = router;
