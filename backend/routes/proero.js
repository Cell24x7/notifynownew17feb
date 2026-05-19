const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const authenticateToken = require('../middleware/authMiddleware');
const axios = require('axios');

const EXTERNAL_BASE_URL = 'https://wa.notifynow.in';

/**
 * @route   GET /api/proero/channels
 * @desc    Get all Proero channels for the logged-in user
 * @access  Private
 */
router.get('/channels', authenticateToken, async (req, res) => {
    try {
        const [rows] = await query(
            'SELECT id, name, phone_number, provider, status, created_at as created FROM whatsapp_proero_channels WHERE user_id = ? ORDER BY id DESC',
            [req.user.id]
        );
        res.json({ success: true, channels: rows });
    } catch (err) {
        console.error('GET PROERO CHANNELS ERROR:', err.message);
        res.status(500).json({ success: false, message: 'Failed to fetch channels' });
    }
});

/**
 * @route   POST /api/proero/channels
 * @desc    Create a new Proero channel
 * @access  Private
 */
router.post('/channels', authenticateToken, async (req, res) => {
    const { name, provider = 'Proero' } = req.body;
    
    if (!name) {
        return res.status(400).json({ success: false, message: 'Channel name is required' });
    }

    try {
        const [result] = await query(
            'INSERT INTO whatsapp_proero_channels (user_id, name, provider, status) VALUES (?, ?, ?, ?)',
            [req.user.id, name, provider, 'pairing']
        );
        
        res.json({ 
            success: true, 
            message: 'Channel created successfully',
            channelId: result.insertId 
        });
    } catch (err) {
        console.error('CREATE PROERO CHANNEL ERROR:', err.message);
        res.status(500).json({ success: false, message: 'Failed to create channel' });
    }
});

/**
 * @route   DELETE /api/proero/channels/:id
 * @desc    Delete a Proero channel
 * @access  Private
 */
router.delete('/channels/:id', authenticateToken, async (req, res) => {
    const channelId = req.params.id;
    
    try {
        // Verify ownership
        const [rows] = await query(
            'SELECT id FROM whatsapp_proero_channels WHERE id = ? AND user_id = ?',
            [channelId, req.user.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Channel not found or unauthorized' });
        }

        await query('DELETE FROM whatsapp_proero_channels WHERE id = ?', [channelId]);
        
        res.json({ success: true, message: 'Channel deleted successfully' });
    } catch (err) {
        console.error('DELETE PROERO CHANNEL ERROR:', err.message);
        res.status(500).json({ success: false, message: 'Failed to delete channel' });
    }
});

/**
 * @route   POST /api/proero/channels/:id/sync
 * @desc    Sync status of a Proero channel by querying the WhatsApp sessions API
 * @access  Private
 */
router.post('/channels/:id/sync', authenticateToken, async (req, res) => {
    const channelId = req.params.id;
    const sessionName = `session${channelId}`;
    
    try {
        // Get channel from DB
        const [channels] = await query(
            'SELECT id, phone_number, status FROM whatsapp_proero_channels WHERE id = ? AND user_id = ?',
            [channelId, req.user.id]
        );
        
        if (channels.length === 0) {
            return res.status(404).json({ success: false, message: 'Channel not found or unauthorized' });
        }
        
        // Query sessions from wa.notifynow.in
        const response = await axios.get(`${EXTERNAL_BASE_URL}/api/whatsapp/sessions`);
        const sessions = response.data.sessions || response.data.data?.sessions || response.data || [];
        
        let isConnected = false;
        let phoneNumber = channels[0].phone_number;
        
        if (Array.isArray(sessions)) {
            const session = sessions.find(s => s.sessionName === sessionName || s.name === sessionName || s.id === sessionName);
            if (session) {
                isConnected = session.status === 'connected' || session.state === 'CONNECTED' || session.ready === true;
                phoneNumber = session.phone || session.number || session.wid || phoneNumber;
            }
        } else if (typeof sessions === 'object') {
            const session = sessions[sessionName];
            if (session) {
                isConnected = session.status === 'connected' || session.state === 'CONNECTED' || session.ready === true;
                phoneNumber = session.phone || session.number || session.wid || phoneNumber;
            }
        }
        
        const newStatus = isConnected ? 'connected' : 'disconnected';
        
        // Update DB
        await query(
            'UPDATE whatsapp_proero_channels SET status = ?, phone_number = ? WHERE id = ?',
            [newStatus, phoneNumber, channelId]
        );
        
        res.json({
            success: true,
            status: newStatus,
            phone_number: phoneNumber,
            message: `Channel synced. Status: ${newStatus}`
        });
    } catch (err) {
        console.error('SYNC PROERO CHANNEL ERROR:', err.message);
        res.status(500).json({ success: false, message: 'Failed to sync channel status' });
    }
});

/**
 * @route   POST /api/proero/channels/:id/disconnect
 * @desc    Disconnect/Logout a Proero channel session
 * @access  Private
 */
router.post('/channels/:id/disconnect', authenticateToken, async (req, res) => {
    const channelId = req.params.id;
    const sessionName = `session${channelId}`;
    
    try {
        // Verify channel ownership
        const [channels] = await query(
            'SELECT id FROM whatsapp_proero_channels WHERE id = ? AND user_id = ?',
            [channelId, req.user.id]
        );
        
        if (channels.length === 0) {
            return res.status(404).json({ success: false, message: 'Channel not found or unauthorized' });
        }
        
        // Call logout API
        try {
            await axios.post(`${EXTERNAL_BASE_URL}/api/whatsapp/logout`, { sessionName });
        } catch (logoutErr) {
            console.warn('Logout API call failed, proceeding with DB update:', logoutErr.message);
        }
        
        // Update DB
        await query(
            'UPDATE whatsapp_proero_channels SET status = ? WHERE id = ?',
            ['disconnected', channelId]
        );
        
        res.json({ success: true, message: 'Channel disconnected successfully' });
    } catch (err) {
        console.error('DISCONNECT PROERO CHANNEL ERROR:', err.message);
        res.status(500).json({ success: false, message: 'Failed to disconnect channel' });
    }
});

/**
 * @route   ANY /api/proero/proxy/*
 * @desc    Proxy requests to Unofficial WhatsApp API to bypass CORS
 * @access  Private
 */
router.all('/proxy/*', authenticateToken, async (req, res) => {
    const path = req.params[0] || req.path.replace('/proxy/', '');
    const method = req.method;
    const url = `${EXTERNAL_BASE_URL}/${path}`;
    
    try {
        const response = await axios({
            method,
            url,
            data: req.body,
            params: req.query,
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        res.json(response.data);
    } catch (err) {
        console.error(`PROXY ERROR (${method} ${url}):`, err.response?.data || err.message);
        res.status(err.response?.status || 500).json(err.response?.data || { success: false, message: 'Proxy request failed' });
    }
});

module.exports = router;
