const express = require('express');
const { query } = require('../config/db');
const authenticate = require('../middleware/authMiddleware');
const multer = require('multer');
const { submitBotToDotgo, verifyBotToDotgo } = require('../services/rcsService');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * Redesigned Bot Submission (Step 1 & 2 Combined)
 */
router.post('/submit', authenticate, upload.fields([
    { name: 'botLogo', maxCount: 1 },
    { name: 'bannerImage', maxCount: 1 }
]), async (req, res) => {
    try {
        const userId = req.user.id;
        const payload = JSON.parse(req.body.data);

        // Handle file uploads
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const fs = require('fs');
        const path = require('path');
        const uploadsDir = path.join(__dirname, '../uploads/bots');

        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        let botLogoUrl = "";
        let bannerImageUrl = "";

        if (req.files['botLogo']) {
            const file = req.files['botLogo'][0];
            const fileName = `logo_${Date.now()}_${file.originalname}`;
            const filePath = path.join(uploadsDir, fileName);
            fs.writeFileSync(filePath, file.buffer);
            botLogoUrl = `${baseUrl}/uploads/bots/${fileName}`;
        }

        if (req.files['bannerImage']) {
            const file = req.files['bannerImage'][0];
            const fileName = `banner_${Date.now()}_${file.originalname}`;
            const filePath = path.join(uploadsDir, fileName);
            fs.writeFileSync(filePath, file.buffer);
            bannerImageUrl = `${baseUrl}/uploads/bots/${fileName}`;
        }

        // Prepare data for Dotgo (wrapping back into their expected structure if needed)
        // But the user said "verification ka hata deana api ok", so we can be more local-first
        // if Dotgo service fails or if we want to skip it.
        const dotgoPayload = {
            data: {
                bot: {
                    privacy_url: payload.privacy_url,
                    term_and_condition_url: payload.terms_url,
                    platform: 'GSMA API',
                    phone_list: [{ value: payload.primary_phone, label: payload.primary_phone_label }],
                    email_list: [{ value: payload.primary_email, label: payload.primary_email_label }],
                    website_list: [{ value: payload.primary_website, label: payload.primary_website_label }]
                },
                rcs_bot: {
                    lang_supported: payload.languages_supported,
                    agent_msg_type: payload.message_type,
                    billing_category: payload.billing_category || 'Conversational',
                    webhook_url: payload.webhook_url
                },
                bot_desc: [{ bot_name: payload.bot_name, bot_summary: payload.short_description }],
                agent_color: payload.brand_color || '#000000',
                bot_logo_url: botLogoUrl,
                banner_logo_url: bannerImageUrl
            },
            brand_details: {
                brand_name: payload.brand_name,
                brand_address: 'India', // Default
                brand_industry: 'Technology' // Default
            },
            carrier_details: { carrier_list: [97, 77, 98], global_reach: false },
            region: payload.region
        };

        let botId = `BOT_${Date.now()}`;
        let brandId = `BRAND_${Date.now()}`;
        let status = 'APPROVED'; // Set to approved immediately as requested

        try {
            const result = await submitBotToDotgo(dotgoPayload);
            if (result.success) {
                botId = result.bot_id;
                brandId = result.brand_id;
            } else {
                console.warn('⚠️ Dotgo Submission failed but proceeding locally:', result.error);
            }
        } catch (e) {
            console.error('❌ Dotgo Service Error:', e.message);
        }

        // 1. Save to rcs_bot_master
        const [masterResult] = await query(
            `INSERT INTO rcs_bot_master (
                user_id, brand_id, bot_id, brand_name, 
                bot_name, short_description, brand_color,
                route_type, bot_type, message_type, billing_category, status,
                webhook_url, languages_supported, bot_logo_url, banner_image_url,
                terms_url, privacy_url, rcs_api
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                userId, brandId, botId, payload.brand_name,
                payload.bot_name, payload.short_description, payload.brand_color,
                payload.region === 'India' ? 'DOMESTIC' : 'INTERNATIONAL',
                payload.region === 'India' ? 'DOMESTIC' : 'INTERNATIONAL',
                payload.message_type, payload.billing_category, status,
                payload.webhook_url, payload.languages_supported, botLogoUrl, bannerImageUrl,
                payload.terms_url, payload.privacy_url, payload.rcs_api
            ]
        );

        // 2. Save Contacts to rcs_bot_contacts
        const contacts = [
            { type: 'PHONE', value: payload.primary_phone, label: payload.primary_phone_label },
            { type: 'EMAIL', value: payload.primary_email, label: payload.primary_email_label },
            { type: 'WEBSITE', value: payload.primary_website, label: payload.primary_website_label },
            { type: 'WEBSITE', value: payload.other_website, label: payload.other_website_label }
        ].filter(c => c.value);

        for (const contact of contacts) {
            await query(
                `INSERT INTO rcs_bot_contacts (bot_id, contact_type, contact_value, label) VALUES (?, ?, ?, ?)`,
                [masterResult.insertId, contact.type, contact.value, contact.label]
            );
        }

        // 3. Automatically create an rcs_configs entry
        const [adminConfigs] = await query('SELECT auth_url, api_base_url, client_id, client_secret FROM rcs_configs LIMIT 1');
        const admin = adminConfigs?.[0] || {};

        const [configResult] = await query(
            `INSERT INTO rcs_configs (name, auth_url, api_base_url, client_id, client_secret, bot_id) 
                VALUES (?, ?, ?, ?, ?, ?)`,
            [
                `${payload.bot_name} Config`,
                admin.auth_url || 'https://auth.dotgo.com/auth/oauth/token',
                admin.api_base_url || 'https://api.dotgo.com/rcs/v1',
                admin.client_id || '',
                admin.client_secret || '',
                botId
            ]
        );

        // Assign to user
        await query('UPDATE users SET rcs_config_id = ? WHERE id = ?', [configResult.insertId, userId]);

        res.json({
            success: true,
            bot_id: botId,
            brand_id: brandId,
            message: 'Bot created and configured successfully'
        });

    } catch (error) {
        console.error('❌ Redesigned Submit Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * Step 2: Verify Bot (with images)
 */
router.post('/verify', authenticate, upload.fields([
    { name: 'screenImages', maxCount: 1 },
    { name: 'brandLogoImage', maxCount: 1 }
]), async (req, res) => {
    try {
        const userId = req.user.id;
        const verifyData = JSON.parse(req.body.data);
        const files = {
            screenImages: req.files['screenImages']?.[0],
            brandLogoImage: req.files['brandLogoImage']?.[0]
        };

        const result = await verifyBotToDotgo(verifyData, files);

        if (result.success) {
            // Update local bot master status
            await query(
                'UPDATE rcs_bot_master SET status = "APPROVED", bot_id = ? WHERE user_id = ? AND brand_name = ?',
                [verifyData.bot_id, userId, verifyData.brand_details?.brand_name]
            );

            // After successful verification, create rcs_config entry
            const configName = `${verifyData.brand_details?.brand_name} Config`;

            // Fetch default admin config for URLs
            const [adminConfigs] = await query('SELECT auth_url, api_base_url, client_id, client_secret FROM rcs_configs LIMIT 1');
            const hasAdmin = adminConfigs && adminConfigs.length > 0;
            const admin = hasAdmin ? adminConfigs[0] : {};

            const [configResult] = await query(
                `INSERT INTO rcs_configs (name, auth_url, api_base_url, client_id, client_secret, bot_id) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    configName,
                    admin.auth_url || 'https://auth.dotgo.com/auth/oauth/token',
                    admin.api_base_url || 'https://api.dotgo.com/rcs/v1',
                    admin.client_id || process.env.DOTGO_ADMIN_CLIENT_ID || '',
                    admin.client_secret || process.env.DOTGO_ADMIN_CLIENT_SECRET || '',
                    verifyData.bot_id
                ]
            );

            // Assign this config to the user
            await query('UPDATE users SET rcs_config_id = ? WHERE id = ?', [configResult.insertId, userId]);

            res.json({ success: true, message: 'Bot verification submitted and assigned successfully' });
        } else {
            res.status(400).json({ success: false, message: result.error });
        }
    } catch (error) {
        console.error('❌ Bot Verify Error:', error.message);
        res.status(500).json({ success: false, message: 'Server error during bot verification' });
    }
});

/**
 * Get all bots for the user
 */
router.get('/', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const [bots] = await query(
            'SELECT * FROM rcs_bot_master WHERE user_id = ? ORDER BY created_at DESC',
            [userId]
        );
        res.json(bots);
    } catch (error) {
        console.error('❌ Get Bots Error:', error.message);
        res.status(500).json({ success: false, message: 'Failed to fetch bots' });
    }
});

module.exports = router;
