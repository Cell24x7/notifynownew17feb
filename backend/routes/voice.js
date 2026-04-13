const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authMiddleware');
const multer = require('multer');
const { uploadVoiceAudio } = require('../services/voiceService');
const { query } = require('../config/db');

// Handle Audio file upload (max 10MB for voice)
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } 
});

/**
 * @route POST /api/voice/upload
 * @desc Upload an audio file to the voice gateway and return the Audio ID
 */
router.post('/upload', authenticate, upload.single('audio_file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: 'No audio file uploaded' });

        const userId = req.user.id;
        
        // Fetch user's voice config (mdsmedia credentials)
        const [configs] = await query(`
            SELECT v.* 
            FROM users u 
            LEFT JOIN voice_configs v ON u.ai_voice_config_id = v.id 
            WHERE u.id = ?
        `, [userId]);
        
        // Fallback to your provided credentials if not explicitly assigned in DB
        const voiceConfig = configs[0]?.api_user ? configs[0] : { 
            api_user: 'mdsmedia', 
            api_password: 'apimdsmedia' 
        };

        console.log(`🎙️ Uploading audio for User ${userId} to Voice Gateway...`);
        const result = await uploadVoiceAudio(req.file.buffer, req.file.originalname, voiceConfig);

        if (result.success) {
            res.json({ 
                success: true, 
                audioId: result.audioId,
                fileName: req.file.originalname,
                message: 'Audio uploaded successfully to Voice Gateway' 
            });
        } else {
            res.status(500).json({ success: false, message: result.error || 'Failed to upload audio to gateway' });
        }
    } catch (error) {
        console.error('❌ Voice Upload Route Error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * @route POST /api/voice/configs
 * @desc Create or update voice configuration
 */
router.post('/configs', authenticate, async (req, res) => {
    try {
        const { name, api_user, api_password, status } = req.body;
        if (!name || !api_user || !api_password) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }
        const [result] = await query('INSERT INTO voice_configs (name, api_user, api_password, status) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=?, api_user=?, api_password=?, status=?', [name, api_user, api_password, status || 'active', name, api_user, api_password, status || 'active']);
        res.json({ success: true, message: 'Configuration saved successfully', configId: result.insertId || result.id });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * @route GET /api/voice/configs
 * @desc Get available voice configurations
 */
router.get('/configs', authenticate, async (req, res) => {
    try {
        const [configs] = await query('SELECT id, name, api_user, status FROM voice_configs');
        res.json({ success: true, configs });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
