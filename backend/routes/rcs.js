const express = require('express');
const { query } = require('../config/db');

const router = express.Router();

// Get all bots
router.get('/bots', async (req, res) => {
  try {
    const [bots] = await query('SELECT * FROM rcs_bot_master');
    res.json(bots);
  } catch (error) {
    if (error.code === 'ER_NO_SUCH_TABLE') {
      return res.json([]); // Return empty if table doesn't exist yet
    }
    res.status(500).json({ error: error.message });
  }
});

// Get bot by ID with contacts and media
router.get('/bots/:id', async (req, res) => {
  try {
    const [bots] = await query('SELECT * FROM rcs_bot_master WHERE id = ?', [req.params.id]);
    if (!bots.length) return res.status(404).json({ error: 'Bot not found' });

    const [contacts] = await query('SELECT * FROM rcs_bot_contacts WHERE bot_id = ?', [req.params.id]);
    const [media] = await query('SELECT * FROM rcs_bot_media WHERE bot_id = ?', [req.params.id]);

    res.json({ ...bots[0], contacts, media });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create or update bot configuration
router.post('/bots', async (req, res) => {
  try {
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
      status,
      contacts,
      media
    } = req.body;

    // Insert bot master
    const [result] = await query(
      `INSERT INTO rcs_bot_master (
        route_type, bot_type, message_type, billing_category, bot_name, brand_name,
        short_description, brand_color, bot_logo_url, banner_image_url, terms_url,
        privacy_url, development_platform, webhook_url, callback_url, languages_supported,
        agree_all_carriers, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        route_type, bot_type, message_type, billing_category, bot_name, brand_name,
        short_description, brand_color, bot_logo_url, banner_image_url, terms_url,
        privacy_url, development_platform, webhook_url, callback_url, languages_supported,
        agree_all_carriers, status
      ]
    );

    const botId = result.insertId;

    // Insert contacts
    if (contacts && contacts.length > 0) {
      for (const contact of contacts) {
        await query(
          'INSERT INTO rcs_bot_contacts (bot_id, contact_type, contact_value, label) VALUES (?, ?, ?, ?)',
          [botId, contact.contact_type, contact.contact_value, contact.label]
        );
      }
    }

    // Insert media
    if (media && media.length > 0) {
      for (const mediaItem of media) {
        await query(
          'INSERT INTO rcs_bot_media (bot_id, media_type, media_url) VALUES (?, ?, ?)',
          [botId, mediaItem.media_type, mediaItem.media_url]
        );
      }
    }

    res.status(201).json({ id: botId, message: 'Bot configuration created successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Update bot configuration
router.put('/bots/:id', async (req, res) => {
  try {
    const { bot_name, brand_name, short_description, brand_color, status } = req.body;

    await query(
      `UPDATE rcs_bot_master SET 
        bot_name = ?, brand_name = ?, short_description = ?, brand_color = ?, status = ?,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [bot_name, brand_name, short_description, brand_color, status, req.params.id]
    );

    res.json({ message: 'Bot configuration updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete bot
router.delete('/bots/:id', async (req, res) => {
  try {
    await query('DELETE FROM rcs_bot_master WHERE id = ?', [req.params.id]);
    res.json({ message: 'Bot configuration deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
