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
        
        // Use assigned config, otherwise fallback to cell24x7 defaults
        const voiceConfig = configs[0]?.id ? configs[0] : { 
            api_user: 'Idpupil2024', 
            api_password: 'apipupil2024',
            provider: 'cell24x7'
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
        const { name, api_user, api_password, provider, base_url, api_key, status } = req.body;
        if (!name) {
            return res.status(400).json({ success: false, message: 'Name is required' });
        }
        
        const finalProvider = provider || 'cell24x7';
        
        const [result] = await query(
            `INSERT INTO voice_configs (name, api_user, api_password, provider, base_url, api_key, status) 
             VALUES (?, ?, ?, ?, ?, ?, ?) 
             ON DUPLICATE KEY UPDATE name=?, api_user=?, api_password=?, provider=?, base_url=?, api_key=?, status=?`, 
            [
                name, api_user || '', api_password || '', finalProvider, base_url || '', api_key || '', status || 'active', 
                name, api_user || '', api_password || '', finalProvider, base_url || '', api_key || '', status || 'active'
            ]
        );
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
        const [configs] = await query('SELECT id, name, api_user, provider, base_url, status FROM voice_configs');
        res.json({ success: true, configs });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * @route DELETE /api/voice/configs/:id
 * @desc Delete a voice configuration
 */
router.delete('/configs/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await query('DELETE FROM voice_configs WHERE id = ?', [id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Configuration not found' });
        }
        
        res.json({ success: true, message: 'Configuration deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
