const express = require('express');
const axios = require('axios');
const { query } = require('../config/db');
const authenticate = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * Helper to get WhatsApp config for the user
 */
const getWhatsAppConfig = async (userId) => {
    // Join with users to get the config_id
    const [users] = await query('SELECT whatsapp_config_id FROM users WHERE id = ?', [userId]);
    if (!users.length || !users[0].whatsapp_config_id) {
        throw new Error('WhatsApp not configured for this account');
    }

    const [configs] = await query('SELECT * FROM whatsapp_configs WHERE id = ? AND is_active = 1', [users[0].whatsapp_config_id]);
    if (!configs.length) {
        throw new Error('WhatsApp configuration not found or inactive');
    }

    return configs[0];
};

/**
 * @route GET /api/whatsapp/templates
 * @desc Fetch available WhatsApp templates from Facebook Graph API
 */
router.get('/templates', authenticate, async (req, res) => {
    try {
        const config = await getWhatsAppConfig(req.user.id);

        const response = await axios.get(`https://graph.facebook.com/v19.0/${config.wa_biz_accnt_id}/message_templates`, {
            headers: {
                'Authorization': `Bearer ${config.wa_token}`
            }
        });

        res.json({ success: true, templates: response.data.data });
    } catch (error) {
        console.error('❌ Error fetching WhatsApp templates:', error.response?.data || error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch WhatsApp templates',
            error: error.response?.data?.error?.message || error.message
        });
    }
});

/**
 * @route POST /api/whatsapp/send-template
 * @desc Send a WhatsApp template message
 */
router.post('/send-template', authenticate, async (req, res) => {
    try {
        const { to, templateName, languageCode, components } = req.body;
        const config = await getWhatsAppConfig(req.user.id);

        if (!to || !templateName) {
            return res.status(400).json({ success: false, message: 'Recipient and template name are required' });
        }

        const data = {
            messaging_product: "whatsapp",
            to: to,
            type: "template",
            template: {
                name: templateName,
                language: {
                    code: languageCode || 'en_US'
                }
            }
        };

        if (components) {
            data.template.components = components;
        }

        const response = await axios.post(
            `https://graph.facebook.com/v19.0/${config.ph_no_id}/messages`,
            data,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.wa_token}`
                }
            }
        );

        res.json({ success: true, message: 'Message sent successfully', data: response.data });
    } catch (error) {
        console.error('❌ Error sending WhatsApp message:', error.response?.data || error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to send WhatsApp message',
            error: error.response?.data?.error?.message || error.message
        });
    }
});

/**
 * @route POST /api/whatsapp/templates
 * @desc Create a new WhatsApp template
 */
router.post('/templates', authenticate, async (req, res) => {
    try {
        const { name, category, language, components } = req.body;
        const config = await getWhatsAppConfig(req.user.id);

        const response = await axios.post(
            `https://graph.facebook.com/v19.0/${config.wa_biz_accnt_id}/message_templates`,
            { name, category, language, components },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.wa_token}`
                }
            }
        );

        res.json({ success: true, message: 'Template created successfully', data: response.data });
    } catch (error) {
        console.error('❌ Error creating WhatsApp template:', error.response?.data || error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to create WhatsApp template',
            error: error.response?.data?.error?.message || error.message
        });
    }
});

/**
 * @route DELETE /api/whatsapp/templates/:name
 * @desc Delete a WhatsApp template
 */
router.delete('/templates/:name', authenticate, async (req, res) => {
    try {
        const templateName = req.params.name;
        const config = await getWhatsAppConfig(req.user.id);

        const response = await axios.delete(
            `https://graph.facebook.com/v19.0/${config.wa_biz_accnt_id}/message_templates?name=${templateName}`,
            {
                headers: {
                    'Authorization': `Bearer ${config.wa_token}`
                }
            }
        );

        res.json({ success: true, message: 'Template deleted successfully', data: response.data });
    } catch (error) {
        console.error('❌ Error deleting WhatsApp template:', error.response?.data || error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to delete WhatsApp template',
            error: error.response?.data?.error?.message || error.message
        });
    }
});

module.exports = router;
