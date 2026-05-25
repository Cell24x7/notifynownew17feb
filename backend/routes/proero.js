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

// ═══════════════════════════════════════════════════════════════
// CAMPAIGN CONTACT MANAGEMENT  (intercepted before wildcard proxy)
// ═══════════════════════════════════════════════════════════════

/**
 * @route   POST /api/proero/proxy/api/campaign/add-contacts
 * @desc    Forward add-contacts to Baileys AND mirror into local api_campaign_queue
 * @access  Private
 */
router.post('/proxy/api/campaign/add-contacts', authenticateToken, async (req, res) => {
    const { campaign_id, user_id, contacts } = req.body;

    // 1. Forward to Baileys (keep variables since Baileys schema now supports them)
    let proeroResponse = null;
    try {
        const formattedContacts = Array.isArray(contacts) ? contacts.map(c => {
            if (c && typeof c === 'object') {
                const phoneVal = c.phone || c.number || c.mobile || '';
                const phone = String(phoneVal).replace(/\D/g, '');
                return {
                    phone,
                    variables: c.variables || {}
                };
            }
            const phone = String(c).replace(/\D/g, '');
            return {
                phone,
                variables: {}
            };
        }).filter(c => c.phone.length >= 10) : [];

        const payloadToRemote = {
            ...req.body,
            contacts: formattedContacts
        };
        
        console.log("-----------------------------------------");
        console.log("➡️ FORWARDING TO REMOTE BAILEYS SERVER");
        console.log("URL:", `${EXTERNAL_BASE_URL}/api/campaign/add-contacts`);
        console.log("PAYLOAD:", JSON.stringify(payloadToRemote, null, 2));
        console.log("-----------------------------------------");

        const r = await axios.post(`${EXTERNAL_BASE_URL}/api/campaign/add-contacts`, payloadToRemote, {
            headers: { 'Content-Type': 'application/json' }
        });
        proeroResponse = r.data;
    } catch (err) {
        console.error('add-contacts proxy error:', err.response?.data || err.message);
        return res.status(err.response?.status || 500).json(
            err.response?.data || { success: false, message: 'Proero add-contacts failed' }
        );
    }

    // 2. Mirror into local DB (keep the variables!)
    if (campaign_id && Array.isArray(contacts) && contacts.length > 0) {
        try {
            const uid = req.user?.id || user_id;
            const values = contacts.map(c => {
                let mobile = '';
                let variables = null;
                if (c && typeof c === 'object') {
                    const phoneVal = c.phone || c.number || c.mobile || '';
                    mobile = String(phoneVal).replace(/\D/g, '');
                    variables = c.variables ? JSON.stringify(c.variables) : null;
                } else {
                    mobile = String(c).replace(/\D/g, '');
                }
                return [campaign_id, uid, mobile, 'staged', variables];
            });
            await query(
                'INSERT IGNORE INTO api_campaign_queue (campaign_id, user_id, mobile, status, variables) VALUES ?',
                [values]
            );
        } catch (dbErr) {
            console.warn('Local DB mirror for add-contacts failed:', dbErr.message);
        }
    }

    res.json(proeroResponse);
});

/**
 * @route   POST /api/proero/proxy/api/campaign/delete-contacts
 * @desc    Forward delete-contacts to Baileys AND remove from local api_campaign_queue
 * @access  Private
 */
router.post('/proxy/api/campaign/delete-contacts', authenticateToken, async (req, res) => {
    const { campaign_id, contacts, numbers } = req.body;
    const toDelete = contacts || numbers || [];

    // 1. Forward to Baileys (best-effort, don't fail if remote rejects)
    let proeroResponse = { success: true, message: 'Removed locally' };
    try {
        const r = await axios.post(`${EXTERNAL_BASE_URL}/api/campaign/delete-contacts`, req.body, {
            headers: { 'Content-Type': 'application/json' }
        });
        proeroResponse = r.data;
    } catch (err) {
        console.warn('delete-contacts proxy error (continuing with local delete):', err.message);
    }

    // 2. Remove from local DB
    if (campaign_id) {
        try {
            if (!toDelete || toDelete.length === 0) {
                // Clear all contacts for this campaign
                await query('DELETE FROM api_campaign_queue WHERE campaign_id = ?', [campaign_id]);
            } else {
                const cleaned = toDelete.map(c => String(c).replace(/\D/g, ''));
                if (cleaned.length > 0) {
                    await query(
                        `DELETE FROM api_campaign_queue WHERE campaign_id = ? AND mobile IN (${cleaned.map(() => '?').join(',')})`,
                        [campaign_id, ...cleaned]
                    );
                }
            }
        } catch (dbErr) {
            console.warn('Local DB delete for delete-contacts failed:', dbErr.message);
        }
    }

    res.json(proeroResponse);
});

/**
 * @route   GET /api/proero/proxy/api/campaign/:campaignId/contacts
 * @desc    Return staged contacts from local DB, enriched with names from webhook_logs
 * @access  Private
 */
router.get('/proxy/api/campaign/:campaignId/contacts', authenticateToken, async (req, res) => {
    const { campaignId } = req.params;
    const uid = req.user?.id;

    try {
        const [contacts] = await query(
            'SELECT mobile, status, variables, created_at FROM api_campaign_queue WHERE campaign_id = ? AND user_id = ? ORDER BY created_at DESC',
            [campaignId, uid]
        );

        // Enrich with names from webhook_logs
        let nameMap = {};
        if (contacts.length > 0) {
            const mobiles = contacts.map(c => c.mobile);
            try {
                const placeholders = mobiles.map(() => '?').join(',');
                const [logs] = await query(
                    `SELECT sender, recipient, sender_name, contact_name 
                     FROM webhook_logs 
                     WHERE user_id = ? AND (sender IN (${placeholders}) OR recipient IN (${placeholders}))
                     ORDER BY id DESC LIMIT 1000`,
                    [uid, ...mobiles, ...mobiles]
                );
                logs.forEach(l => {
                    const name = l.sender_name || l.contact_name || null;
                    if (name) {
                        [l.sender, l.recipient].forEach(num => {
                            if (num) {
                                const cleaned = String(num).replace(/\D/g, '');
                                if (mobiles.includes(cleaned) && !nameMap[cleaned]) {
                                    nameMap[cleaned] = name;
                                }
                            }
                        });
                    }
                });
            } catch (e) {
                // Name enrichment is optional, silently skip
            }
        }

        const enriched = contacts.map(c => {
            let parsedVars = null;
            if (c.variables) {
                try {
                    parsedVars = typeof c.variables === 'string' ? JSON.parse(c.variables) : c.variables;
                } catch (e) {
                    console.warn('Failed to parse contact variables JSON:', e.message);
                }
            }
            return {
                number: c.mobile,
                status: c.status,
                created_at: c.created_at,
                name: nameMap[c.mobile] || null,
                variables: parsedVars
            };
        });

        res.json({ success: true, campaignId, total: enriched.length, contacts: enriched });
    } catch (err) {
        console.error('Get staged contacts error:', err.message);
        res.status(500).json({ success: false, message: 'Failed to fetch staged contacts' });
    }
});

/**
 * @route   GET /api/proero/proxy/api/campaign/:campaignId/status
 * @desc    Return campaign delivery status: remote Baileys + local DB counters
 * @access  Private
 */
router.get('/proxy/api/campaign/:campaignId/status', authenticateToken, async (req, res) => {
    const { campaignId } = req.params;
    const uid = req.user?.id;

    try {
        // 1. Try remote Baileys status
        let remoteStatus = null;
        try {
            const r = await axios.get(`${EXTERNAL_BASE_URL}/api/campaign/${campaignId}/status`, { timeout: 4000 });
            remoteStatus = r.data;
        } catch (e) {
            // Fallback to local counters
        }

        // 2. Local counters from api_campaign_queue
        const [rows] = await query(
            `SELECT status, COUNT(*) as count FROM api_campaign_queue 
             WHERE campaign_id = ? AND user_id = ? GROUP BY status`,
            [campaignId, uid]
        );
        const localCounts = { staged: 0, pending: 0, sent: 0, failed: 0, in_progress: 0 };
        rows.forEach(r => { if (localCounts.hasOwnProperty(r.status)) localCounts[r.status] = Number(r.count); });
        const localTotal = Object.values(localCounts).reduce((a, b) => a + b, 0);
        const localSent = localCounts.sent || 0;
        const completionPct = localTotal > 0 ? Math.round((localSent / localTotal) * 100) : 0;

        let mappedRemote = null;
        if (remoteStatus?.success && remoteStatus?.data) {
            const remoteData = remoteStatus.data;
            const breakdown = remoteData.message_breakdown || {};
            mappedRemote = {
                staged: breakdown.staged || 0,
                pending: breakdown.pending || 0,
                in_progress: breakdown.in_progress || 0,
                sent: breakdown.sent || 0,
                delivered: breakdown.delivered || 0,
                read: breakdown.read || 0,
                failed: breakdown.failed || 0
            };
        }

        res.json({
            success: true,
            campaignId,
            local: localCounts,
            remote: mappedRemote,
            total: localTotal,
            completionPercentage: remoteStatus?.data?.metrics?.progress_percentage ?? remoteStatus?.completionPercentage ?? completionPct
        });
    } catch (err) {
        console.error('Campaign status error:', err.message);
        res.status(500).json({ success: false, message: 'Failed to fetch campaign status' });
    }
});
// ═══════════════════════════════════════════════════════════════

// Intercept old template GET path to map to new Postman collection template path
router.get('/proxy/api/campaign/templates/user/:userId', authenticateToken, async (req, res) => {
    try {
        const response = await axios.get(`${EXTERNAL_BASE_URL}/api/template/templates/user/${req.params.userId}`);
        res.json(response.data);
    } catch (err) {
        console.error('Mapped template get error:', err.response?.data || err.message);
        res.status(err.response?.status || 500).json(err.response?.data || { success: false, message: 'Failed to fetch templates' });
    }
});

// Intercept old template POST path to map to new Postman collection template path
router.post('/proxy/api/campaign/templates/save', authenticateToken, async (req, res) => {
    try {
        const response = await axios.post(`${EXTERNAL_BASE_URL}/api/template/save`, req.body);
        res.json(response.data);
    } catch (err) {
        console.error('Mapped template save error:', err.response?.data || err.message);
        res.status(err.response?.status || 500).json(err.response?.data || { success: false, message: 'Failed to save template' });
    }
});

// Intercept old template DELETE path to map to new Postman collection template path
router.delete('/proxy/api/campaign/templates/:templateId', authenticateToken, async (req, res) => {
    try {
        const response = await axios.delete(`${EXTERNAL_BASE_URL}/api/template/templates/${req.params.templateId}`, {
            data: req.body
        });
        res.json(response.data);
    } catch (err) {
        console.error('Mapped template delete error:', err.response?.data || err.message);
        res.status(err.response?.status || 500).json(err.response?.data || { success: false, message: 'Failed to delete template' });
    }
});

// ═══════════════════════════════════════════════════════════════

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
