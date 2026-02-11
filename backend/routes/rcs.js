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

// POST /api/rcs/send-campaign - Send RCS campaign to multiple contacts
router.post('/send-campaign', authenticateToken, async (req, res) => {
  try {
    console.log('📤 POST /api/rcs/send-campaign');
    const { campaignName, templateId, contacts, variables, scheduledTime } = req.body;
    const userId = req.user.id;

    // Validation
    if (!campaignName || !templateId || !contacts || contacts.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Campaign name, template ID, and contacts are required'
      });
    }

    console.log(`📊 Campaign: ${campaignName}`);
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
        const mobile = contact.mobile || contact.phone;
        if (!mobile) {
          failedMessages.push({
            contact: contact.name || contact.email,
            error: 'No mobile number provided'
          });
          continue;
        }

        console.log(`📱 Sending to ${mobile}...`);

        // Try sending template first
        let result = null;
        try {
          result = await sendRcsTemplate(mobile, templateId);
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
            name: contact.name || 'Unknown',
            templateId,
            sentAt: new Date(),
            messageId: result.messageId || 'N/A'
          });
          console.log(`✅ Sent to ${mobile}`);
        } else {
          failedMessages.push({
            mobile,
            name: contact.name || 'Unknown',
            error: result?.error || 'Unknown error'
          });
          console.log(`❌ Failed for ${mobile}: ${result?.error || 'Unknown error'}`);
        }
      } catch (error) {
        failedMessages.push({
          contact: contact.name || contact.mobile || 'Unknown',
          error: error.message
        });
        console.error(`❌ Error sending to ${contact.mobile}:`, error.message);
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
          templateId,
          contacts.length,
          sentMessages.length,
          failedMessages.length,
          'sent'
        ]
      );

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
