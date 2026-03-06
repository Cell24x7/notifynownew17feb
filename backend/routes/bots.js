const express = require('express');
const { query } = require('../config/db');
const authenticate = require('../middleware/authMiddleware');
const multer = require('multer');
const { submitBotToDotgo, verifyBotToDotgo } = require('../services/rcsService');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * Step 1: Submit Bot Details
 */
router.post('/submit', authenticate, upload.fields([
    { name: 'botLogoFile', maxCount: 1 },
    { name: 'bannerFile', maxCount: 1 }
]), async (req, res) => {
    try {
        const userId = req.user.id;
        const creationData = JSON.parse(req.body.creation_data);

        // Handle file uploads if present
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const fs = require('fs');
        const path = require('path');
        const uploadsDir = path.join(__dirname, '../uploads/bots');

        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        if (req.files['botLogoFile']) {
            const file = req.files['botLogoFile'][0];
            const fileName = `logo_${Date.now()}_${file.originalname}`;
            const filePath = path.join(uploadsDir, fileName);
            fs.writeFileSync(filePath, file.buffer);
            creationData.data.bot_logo_url = `${baseUrl}/uploads/bots/${fileName}`;
        } else {
            creationData.data.bot_logo_url = "";
        }

        if (req.files['bannerFile']) {
            const file = req.files['bannerFile'][0];
            const fileName = `banner_${Date.now()}_${file.originalname}`;
            const filePath = path.join(uploadsDir, fileName);
            fs.writeFileSync(filePath, file.buffer);
            creationData.data.banner_logo_url = `${baseUrl}/uploads/bots/${fileName}`;
        } else {
            creationData.data.banner_logo_url = "";
        }

        const result = await submitBotToDotgo(creationData);

        if (result.success) {
            // Save to local DB (Step 1)
            await query(
                `INSERT INTO rcs_bot_master (
                    user_id, brand_id, bot_id, brand_name, brand_address, brand_industry, 
                    bot_name, short_description, 
                    route_type, bot_type, message_type, status,
                    webhook_url, languages_supported, bot_logo_url, banner_image_url,
                    terms_url, privacy_url
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SUBMITTED', ?, ?, ?, ?, ?, ?)`,
                [
                    userId,
                    result.brand_id,
                    result.bot_id,
                    creationData.brand_details?.brand_name,
                    creationData.brand_details?.brand_address,
                    creationData.brand_details?.brand_industry,
                    creationData.data?.bot_desc?.[0]?.bot_name,
                    creationData.data?.bot_desc?.[0]?.bot_summary,
                    creationData.region === 'India' ? 'DOMESTIC' : 'INTERNATIONAL',
                    creationData.region === 'India' ? 'DOMESTIC' : 'INTERNATIONAL',
                    creationData.data?.rcs_bot?.agent_msg_type || 'Promotional',
                    creationData.data?.rcs_bot?.webhook_url,
                    creationData.data?.rcs_bot?.lang_supported || 'English',
                    creationData.data.bot_logo_url,
                    creationData.data.banner_logo_url,
                    creationData.data?.bot?.term_and_condition_url || "",
                    creationData.data?.bot?.privacy_url || ""
                ]
            );

            res.json({
                success: true,
                brand_id: result.brand_id,
                bot_id: result.bot_id
            });
        } else {
            res.status(400).json({ success: false, message: result.error });
        }
    } catch (error) {
        console.error('❌ Bot Submit Error:', error.message);
        res.status(500).json({ success: false, message: 'Server error during bot submission' });
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
