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

/**
 * @route GET /api/rcs/templates/external
 * @desc Get list of external templates (Now returns Dotgo hardcoded template)
 */
router.get('/templates/external', authenticateToken, async (req, res) => {
  try {
    const templates = await getExternalTemplates();
    res.json({ success: true, templates });
  } catch (error) {
    console.error('❌ Error in /templates/external:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch templates' });
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

    let sql = `
      SELECT 
        c.id, c.name, c.template_id, c.template_name, c.created_at,
        c.recipient_count, c.sent_count, c.delivered_count, c.read_count, c.failed_count, c.status
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

    // Use Dotgo template as requested
    const finalTemplate = templateName || "Empowering_business";

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

module.exports = router;

