const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const axios = require('axios');
const bcrypt = require('bcryptjs');

const EXTERNAL_BASE_URL = 'https://wa.notifynow.in';

const parseActiveSessions = (resData) => {
    if (!resData) return [];
    if (Array.isArray(resData)) return resData;
    if (resData.data && Array.isArray(resData.data)) return resData.data;
    if (resData.sessions && Array.isArray(resData.sessions)) return resData.sessions;
    if (resData.data?.sessions && Array.isArray(resData.data.sessions)) return resData.data.sessions;
    return resData;
};

/**
 * Enhanced Developer Authentication Middleware
 * Supports Header (x-api-key), Query, and Body parameters (apiKey, username + password/pwd)
 */
const authenticateDeveloper = async (req, res, next) => {
    const params = { ...req.query, ...req.body };
    let apiKey = req.headers['x-api-key'] || params.apiKey || params.apikey;

    // Support standard Authorization: Bearer <key> header
    const authHeader = req.headers['authorization'];
    if ((!apiKey || apiKey.includes('...')) && authHeader && authHeader.startsWith('Bearer ')) {
        apiKey = authHeader.substring(7).trim();
    }

    const username = params.username || params.user;
    const password = params.password || params.pwd;

    try {
        let userRecord = null;

        if (apiKey) {
            const [users] = await query(
                'SELECT id, name, company, role, status, is_api_allowed FROM users WHERE api_key = ?',
                [apiKey]
            );
            if (users.length > 0) userRecord = users[0];
        } else if (username && password) {
            // Support both API-specific password and regular login password as fallback
            const [users] = await query(
                'SELECT id, name, company, role, status, is_api_allowed, api_password, password FROM users WHERE email = ? OR contact_phone = ?',
                [username, username]
            );
            if (users.length > 0) {
                const dbApiPassword = users[0].api_password;
                const dbLoginPassword = users[0].password;
                
                // 1. Try API Password first
                let match = false;
                if (dbApiPassword) {
                    match = await bcrypt.compare(password, dbApiPassword);
                }
                
                // 2. Fallback to Login Password if API Password is not set
                if (!match && !dbApiPassword && dbLoginPassword) {
                    match = await bcrypt.compare(password, dbLoginPassword);
                }

                if (match) {
                    const { api_password, password: _, ...safeUser } = users[0];
                    userRecord = safeUser;
                }
            }
        }

        if (!userRecord) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid Developer Credentials. Provide x-api-key header OR username & password.' 
            });
        }

        if (userRecord.status !== 'active' && userRecord.status !== 'pending') {
            return res.status(403).json({ 
                success: false, 
                message: `Account is inactive (status: ${userRecord.status})` 
            });
        }

        // Keep this check if users must have is_api_allowed enabled
        // If users table has is_api_allowed, let's honor it
        // Developer API is allowed for all authenticated users for now
        // if (userRecord.is_api_allowed === 0 || userRecord.is_api_allowed === false) {
        //     if (userRecord.role !== 'reseller' && userRecord.role !== 'super_admin' && !apiKey) {
        //         return res.status(403).json({ 
        //             success: false, 
        //             message: 'Developer API access is not enabled for your account.' 
        //         });
        //     }
        // }

        req.user = userRecord;
        next();
    } catch (err) {
        console.error('Developer Auth Middleware Error:', err);
        res.status(500).json({ success: false, message: 'Internal Server Error during authentication' });
    }
};

/**
 * @route   POST /api/wa-unofficial-v1/auth/api-key
 * @desc    Retrieve or generate API Key using username & password
 * @access  Public
 */
router.post('/auth/api-key', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username and password are required.' });
    }

    try {
        const [users] = await query(
            'SELECT id, status, api_password, password, api_key FROM users WHERE email = ? OR contact_phone = ?',
            [username, username]
        );

        if (users.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        const user = users[0];
        const dbApiPassword = user.api_password;
        const dbLoginPassword = user.password;

        // Try API Password first, then login password
        let match = false;
        if (dbApiPassword) {
            match = await bcrypt.compare(password, dbApiPassword);
        }
        if (!match && !dbApiPassword && dbLoginPassword) {
            match = await bcrypt.compare(password, dbLoginPassword);
        }

        if (!match) {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        if (user.status !== 'active' && user.status !== 'pending') {
            return res.status(403).json({ success: false, message: `Account is inactive.` });
        }

        let apiKey = user.api_key;
        if (!apiKey) {
            const crypto = require('crypto');
            apiKey = `nn_${crypto.randomBytes(24).toString('hex')}`;
            await query('UPDATE users SET api_key = ? WHERE id = ?', [apiKey, user.id]);
        }

        res.json({
            success: true,
            apiKey,
            message: 'API Key retrieved successfully.'
        });
    } catch (err) {
        console.error('Auth API Key Generation Error:', err);
        res.status(500).json({ success: false, message: 'Internal Server Error.' });
    }
});

/**
 * @route   GET /api/wa-unofficial-v1/channels
 * @desc    List user's unofficial WhatsApp channels and sync status
 * @access  Private (Developer)
 */
router.all('/channels', authenticateDeveloper, async (req, res) => {
    try {
        const [channels] = await query(
            'SELECT id, name, phone_number, provider, status, created_at as created FROM whatsapp_proero_channels WHERE user_id = ? ORDER BY id DESC',
            [req.user.id]
        );

        // Optional: Fetch active sessions from Baileys server to sync dynamically
        let activeSessions = [];
        try {
            const sessionsResponse = await axios.get(`${EXTERNAL_BASE_URL}/api/whatsapp/sessions`, { timeout: 3000 });
            activeSessions = parseActiveSessions(sessionsResponse.data);
        } catch (sessionErr) {
            console.warn('Could not reach Baileys server for live sync:', sessionErr.message);
        }

        const syncedChannels = [];
        for (const chan of channels) {
            const sessionName = `session${chan.id}`;
            let isConnected = false;
            let phoneNumber = chan.phone_number;

            if (Array.isArray(activeSessions)) {
                const found = activeSessions.find(s => s.sessionName === sessionName || s.name === sessionName || s.id === sessionName);
                if (found) {
                    isConnected = found.connected === true || found.status === 'connected' || found.state === 'CONNECTED' || found.ready === true;
                    phoneNumber = found.phone || found.number || found.wid || phoneNumber;
                }
            } else if (typeof activeSessions === 'object' && activeSessions !== null) {
                const found = activeSessions[sessionName];
                if (found) {
                    isConnected = found.connected === true || found.status === 'connected' || found.state === 'CONNECTED' || found.ready === true;
                    phoneNumber = found.phone || found.number || found.wid || phoneNumber;
                }
            }

            const currentStatus = isConnected ? 'connected' : 'disconnected';
            if (currentStatus !== chan.status || phoneNumber !== chan.phone_number) {
                await query(
                    'UPDATE whatsapp_proero_channels SET status = ?, phone_number = ? WHERE id = ?',
                    [currentStatus, phoneNumber, chan.id]
                );
                chan.status = currentStatus;
                chan.phone_number = phoneNumber;
            }
            syncedChannels.push(chan);
        }

        res.json({ success: true, channels: syncedChannels });
    } catch (err) {
        console.error('List Channels API Error:', err);
        res.status(500).json({ success: false, message: 'Failed to list channels: ' + err.message });
    }
});

/**
 * @route   POST /api/wa-unofficial-v1/channels
 * @desc    Create a new unofficial WhatsApp channel
 * @access  Private (Developer)
 */
router.post('/channels', authenticateDeveloper, async (req, res) => {
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
            channelId: result.insertId,
            name,
            provider
        });
    } catch (err) {
        console.error('Create Channel API Error:', err);
        res.status(500).json({ success: false, message: 'Failed to create channel' });
    }
});

/**
 * @route   POST /api/wa-unofficial-v1/channels/:id/connect
 * @desc    Initialize connection session & return QR Code
 * @access  Private (Developer)
 */
router.post('/channels/:id/connect', authenticateDeveloper, async (req, res) => {
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

        // Call connect endpoint on Baileys engine
        const response = await axios.post(`${EXTERNAL_BASE_URL}/api/whatsapp/connect`, { sessionName });
        const qr = response.data.qr || response.data.data?.qr;

        res.json({
            success: true,
            message: 'Connection session initialized. Scan the QR code to connect.',
            qr: qr || null,
            sessionName
        });
    } catch (err) {
        console.error('Connect Channel API Error:', err.response?.data || err.message);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to initialize session: ' + (err.response?.data?.message || err.message) 
        });
    }
});

/**
 * @route   POST /api/wa-unofficial-v1/channels/:id/sync
 * @desc    Force check & sync status of a specific channel
 * @access  Private (Developer)
 */
router.post('/channels/:id/sync', authenticateDeveloper, async (req, res) => {
    const channelId = req.params.id;
    const sessionName = `session${channelId}`;

    try {
        // Verify channel ownership
        const [channels] = await query(
            'SELECT id, phone_number, status FROM whatsapp_proero_channels WHERE id = ? AND user_id = ?',
            [channelId, req.user.id]
        );

        if (channels.length === 0) {
            return res.status(404).json({ success: false, message: 'Channel not found or unauthorized' });
        }

        // Query session status from Baileys engine
        const response = await axios.get(`${EXTERNAL_BASE_URL}/api/whatsapp/sessions`);
        const sessions = parseActiveSessions(response.data);

        let isConnected = false;
        let phoneNumber = channels[0].phone_number;

        if (Array.isArray(sessions)) {
            const session = sessions.find(s => s.sessionName === sessionName || s.name === sessionName || s.id === sessionName);
            if (session) {
                isConnected = session.connected === true || session.status === 'connected' || session.state === 'CONNECTED' || session.ready === true;
                phoneNumber = session.phone || session.number || session.wid || phoneNumber;
            }
        } else if (typeof sessions === 'object' && sessions !== null) {
            const session = sessions[sessionName];
            if (session) {
                isConnected = session.connected === true || session.status === 'connected' || session.state === 'CONNECTED' || session.ready === true;
                phoneNumber = session.phone || session.number || session.wid || phoneNumber;
            }
        }

        const newStatus = isConnected ? 'connected' : 'disconnected';
        await query(
            'UPDATE whatsapp_proero_channels SET status = ?, phone_number = ? WHERE id = ?',
            [newStatus, phoneNumber, channelId]
        );

        res.json({
            success: true,
            status: newStatus,
            phone_number: phoneNumber,
            message: `Channel sync complete. Current status: ${newStatus}`
        });
    } catch (err) {
        console.error('Sync Channel API Error:', err);
        res.status(500).json({ success: false, message: 'Failed to sync channel status' });
    }
});

/**
 * @route   POST /api/wa-unofficial-v1/channels/:id/disconnect
 * @desc    Disconnect/logout WhatsApp session
 * @access  Private (Developer)
 */
router.post('/channels/:id/disconnect', authenticateDeveloper, async (req, res) => {
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

        // Call Baileys logout API
        try {
            await axios.post(`${EXTERNAL_BASE_URL}/api/whatsapp/logout`, { sessionName });
        } catch (logoutErr) {
            console.warn('Logout API call failed, proceeding with DB update:', logoutErr.message);
        }

        // Update local DB status
        await query(
            'UPDATE whatsapp_proero_channels SET status = ? WHERE id = ?',
            ['disconnected', channelId]
        );

        res.json({ success: true, message: 'Channel disconnected successfully' });
    } catch (err) {
        console.error('Disconnect Channel API Error:', err);
        res.status(500).json({ success: false, message: 'Failed to disconnect channel' });
    }
});

/**
 * @route   DELETE /api/wa-unofficial-v1/channels/:id
 * @desc    Delete WhatsApp channel
 * @access  Private (Developer)
 */
router.delete('/channels/:id', authenticateDeveloper, async (req, res) => {
    const channelId = req.params.id;

    try {
        // Verify channel ownership
        const [channels] = await query(
            'SELECT id FROM whatsapp_proero_channels WHERE id = ? AND user_id = ?',
            [channelId, req.user.id]
        );

        if (channels.length === 0) {
            return res.status(404).json({ success: false, message: 'Channel not found or unauthorized' });
        }

        // Delete from local DB
        await query('DELETE FROM whatsapp_proero_channels WHERE id = ?', [channelId]);

        res.json({ success: true, message: 'Channel deleted successfully' });
    } catch (err) {
        console.error('Delete Channel API Error:', err);
        res.status(500).json({ success: false, message: 'Failed to delete channel' });
    }
});

/**
 * @route   GET /api/wa-unofficial-v1/channels/:id/chats
 * @desc    Get list of conversations/chats for a specific channel
 * @access  Private (Developer)
 */
router.get('/channels/:id/chats', authenticateDeveloper, async (req, res) => {
    const channelId = req.params.id;
    const sessionName = `session${channelId}`;

    try {
        // 1. Verify channel ownership
        const [channels] = await query(
            'SELECT id, phone_number FROM whatsapp_proero_channels WHERE id = ? AND user_id = ?',
            [channelId, req.user.id]
        );

        if (channels.length === 0) {
            return res.status(404).json({ success: false, message: 'Channel not found or unauthorized' });
        }

        // 2. Try to fetch live chats list from Baileys engine
        let liveChats = [];
        let fetchedFromBaileys = false;
        try {
            const response = await axios.get(`${EXTERNAL_BASE_URL}/api/whatsapp/session/${sessionName}/chats`, { timeout: 4000 });
            if (response.data && response.data.success) {
                liveChats = response.data.chats || response.data.data || [];
                fetchedFromBaileys = true;
            }
        } catch (baileysErr) {
            console.warn(`[WA-API] Failed to fetch live chats from Baileys for ${sessionName}:`, baileysErr.message);
        }

        // 3. Fallback: Query local database webhook_logs
        const channelPhone = channels[0].phone_number;
        let localChats = [];
        if (channelPhone) {
            const cleanPhone = channelPhone.replace(/\D/g, '');
            const sql = `
                SELECT 
                    contact_phone,
                    MAX(created_at) as last_message_time,
                    MAX(message_content) as last_message,
                    MAX(status) as status
                FROM (
                    SELECT 
                        CASE 
                            WHEN sender = ? THEN recipient
                            ELSE sender 
                        END as contact_phone,
                        created_at,
                        message_content,
                        status
                    FROM webhook_logs 
                    WHERE user_id = ? AND (sender = ? OR recipient = ?)
                ) as channel_logs
                WHERE contact_phone IS NOT NULL AND contact_phone != ?
                GROUP BY contact_phone 
                ORDER BY last_message_time DESC 
                LIMIT 100
            `;
            const [rows] = await query(sql, [cleanPhone, req.user.id, cleanPhone, cleanPhone, cleanPhone]);
            localChats = rows;
        }

        res.json({
            success: true,
            channelId,
            sessionName,
            fetchedFromBaileys,
            chats: fetchedFromBaileys ? liveChats : localChats,
            message: fetchedFromBaileys 
                ? 'Chats retrieved successfully from Baileys session store.' 
                : 'Showing local message logs fallback (Baileys gateway not yet sending live chat syncs).'
        });
    } catch (err) {
        console.error('Get Channel Chats API Error:', err);
        res.status(500).json({ success: false, message: 'Failed to retrieve chats: ' + err.message });
    }
});

/**
 * @route   GET /api/wa-unofficial-v1/channels/:id/chats/:contactPhone
 * @desc    Get detailed message history with a specific contact on this channel
 * @access  Private (Developer)
 */
router.get('/channels/:id/chats/:contactPhone', authenticateDeveloper, async (req, res) => {
    const channelId = req.params.id;
    const contactPhone = req.params.contactPhone.replace(/\D/g, '');
    const sessionName = `session${channelId}`;

    try {
        // 1. Verify channel ownership
        const [channels] = await query(
            'SELECT id, phone_number FROM whatsapp_proero_channels WHERE id = ? AND user_id = ?',
            [channelId, req.user.id]
        );

        if (channels.length === 0) {
            return res.status(404).json({ success: false, message: 'Channel not found or unauthorized' });
        }

        const channelPhone = channels[0].phone_number;
        if (!channelPhone) {
            return res.status(400).json({ success: false, message: 'Channel is not fully connected or does not have a phone number.' });
        }
        const cleanChannelPhone = channelPhone.replace(/\D/g, '');

        // 2. Try to fetch from Baileys engine
        let liveMessages = [];
        let fetchedFromBaileys = false;
        try {
            const response = await axios.get(`${EXTERNAL_BASE_URL}/api/whatsapp/session/${sessionName}/chats/${contactPhone}`, { timeout: 4000 });
            if (response.data && response.data.success) {
                liveMessages = response.data.messages || response.data.data || [];
                fetchedFromBaileys = true;
            }
        } catch (baileysErr) {
            console.warn(`[WA-API] Failed to fetch live messages from Baileys for ${sessionName}/${contactPhone}:`, baileysErr.message);
        }

        // 3. Fallback: Query local database webhook_logs
        let localMessages = [];
        const sql = `
            SELECT 
                id, 
                sender, 
                recipient, 
                message_content, 
                status, 
                created_at 
            FROM webhook_logs 
            WHERE user_id = ? AND (
                (sender = ? AND recipient = ?) OR 
                (sender = ? AND recipient = ?)
            )
            ORDER BY created_at ASC 
            LIMIT 200
        `;
        const [rows] = await query(sql, [
            req.user.id,
            cleanChannelPhone,
            contactPhone,
            contactPhone,
            cleanChannelPhone
        ]);
        localMessages = rows;

        res.json({
            success: true,
            channelId,
            sessionName,
            contactPhone,
            fetchedFromBaileys,
            messages: fetchedFromBaileys ? liveMessages : localMessages,
            message: fetchedFromBaileys
                ? 'Messages retrieved successfully from Baileys session store.'
                : 'Showing local message logs fallback.'
        });
    } catch (err) {
        console.error('Get Channel Contact Chats API Error:', err);
        res.status(500).json({ success: false, message: 'Failed to retrieve messages: ' + err.message });
    }
});

/**
 * @route   POST /api/wa-unofficial-v1/send
 * @desc    Send text/template message to recipient(s) using a WhatsApp channel
 * @access  Private (Developer)
 */
router.post('/send', authenticateDeveloper, async (req, res) => {
    const { 
        channelId, 
        to, 
        message, 
        text, 
        msg, 
        isTemplate = false, 
        templateId,
        campaignId: customCampaignId,
        imageUrl     // ✅ NEW: optional image URL
    } = req.body;

    const messageContent = message || text || msg;

    if (!to) {
        return res.status(400).json({ success: false, message: 'Recipient "to" number(s) is required.' });
    }

    if (!isTemplate && !messageContent && !imageUrl) {
        return res.status(400).json({ success: false, message: 'Message content or imageUrl is required.' });
    }

    if (isTemplate && !templateId) {
        return res.status(400).json({ success: false, message: 'templateId is required when isTemplate is true.' });
    }

    try {
        let channelsToUse = [];

        // 1. Resolve channels to use
        if (channelId && channelId !== 'rotate') {
            const [channels] = await query(
                'SELECT id, name, status, phone_number FROM whatsapp_proero_channels WHERE id = ? AND user_id = ?',
                [channelId, req.user.id]
            );
            if (channels.length === 0) {
                return res.status(404).json({ success: false, message: 'Specified channel not found or unauthorized.' });
            }
            channelsToUse = [channels[0]];
        } else {
            // Find all of the user's channels
            const [channels] = await query(
                'SELECT id, name, status, phone_number FROM whatsapp_proero_channels WHERE user_id = ? ORDER BY id DESC',
                [req.user.id]
            );
            if (channels.length === 0) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'No WhatsApp channels found. Please create a channel first.' 
                });
            }

            // Sync statuses with Baileys server on-the-fly
            let activeSessions = null;
            try {
                const sessionsResponse = await axios.get(`${EXTERNAL_BASE_URL}/api/whatsapp/sessions`, { timeout: 5000 });
                activeSessions = parseActiveSessions(sessionsResponse.data);
            } catch (sessionErr) {
                console.warn('[WA-API] Could not reach Baileys server for live sync:', sessionErr.message);
            }

            const connectedChannels = [];
            for (const chan of channels) {
                let isConnected = chan.status === 'connected'; // Default to existing DB status

                if (activeSessions !== null) {
                    const sessionName = `session${chan.id}`;
                    let foundConnected = false;

                    if (Array.isArray(activeSessions)) {
                        const found = activeSessions.find(s => s.sessionName === sessionName || s.name === sessionName || s.id === sessionName);
                        if (found) {
                            foundConnected = found.connected === true || found.status === 'connected' || found.state === 'CONNECTED' || found.ready === true;
                        }
                    } else if (typeof activeSessions === 'object' && activeSessions !== null) {
                        const found = activeSessions[sessionName];
                        if (found) {
                            foundConnected = found.connected === true || found.status === 'connected' || found.state === 'CONNECTED' || found.ready === true;
                        }
                    }

                    isConnected = foundConnected;

                    const currentStatus = isConnected ? 'connected' : 'disconnected';
                    if (currentStatus !== chan.status) {
                        await query(
                            'UPDATE whatsapp_proero_channels SET status = ? WHERE id = ?',
                            [currentStatus, chan.id]
                        );
                        chan.status = currentStatus;
                    }
                }

                if (isConnected) {
                    connectedChannels.push(chan);
                }
            }

            if (connectedChannels.length === 0) {
                // Last resort fallback: if no channels are marked connected, use the latest channel
                console.warn('[WA-API] No active connected channels found in DB/sync, falling back to latest channel:', channels[0].name);
                channelsToUse = [channels[0]];
            } else {
                // Shuffle the connected channels to load-balance individual API hits
                channelsToUse = connectedChannels.sort(() => Math.random() - 0.5);
            }
        }

        // 2. Parse numbers into array (support both flat strings and objects with variables)
        let contactsArray = [];
        let rawContacts = [];
        if (Array.isArray(to)) {
            rawContacts = to;
        } else if (typeof to === 'string') {
            rawContacts = to.split(',').map(num => num.trim()).filter(Boolean);
        } else {
            rawContacts = [to];
        }

        contactsArray = rawContacts.map(c => {
            if (c && typeof c === 'object') {
                const phoneVal = c.phone || c.number || c.mobile || '';
                return {
                    phone: String(phoneVal).trim().replace(/\D/g, ''),
                    variables: c.variables || {}
                };
            }
            return {
                phone: String(c).trim().replace(/\D/g, ''),
                variables: {}
            };
        }).filter(c => c.phone && c.phone.length >= 10);

        if (contactsArray.length === 0) {
            return res.status(400).json({ success: false, message: 'No valid recipient phone numbers resolved.' });
        }

        // 3. Distribute contacts round-robin across available channels
        const channelGroups = [];
        for (let i = 0; i < channelsToUse.length; i++) {
            channelGroups.push({
                channel: channelsToUse[i],
                contacts: []
            });
        }

        contactsArray.forEach((contact, index) => {
            const groupIndex = index % channelsToUse.length;
            channelGroups[groupIndex].contacts.push(contact);
        });

        // Filter out groups with no contacts
        const activeGroups = channelGroups.filter(g => g.contacts.length > 0);
        const dispatchResults = [];

        for (const group of activeGroups) {
            const { channel, contacts } = group;

            // Generate unique 32-bit INT campaign ID for this chunk
            let finalCampaignId;
            if (customCampaignId && !isNaN(customCampaignId) && activeGroups.length === 1) {
                const parsed = Number(customCampaignId);
                if (parsed > 0 && parsed <= 2147483647) {
                    finalCampaignId = parsed;
                } else {
                    finalCampaignId = Math.floor(Math.random() * 2000000000) + 1;
                }
            } else {
                finalCampaignId = Math.floor(Math.random() * 2000000000) + 1;
            }

            const campaignName = customCampaignId 
                ? `API Bulk Campaign: ${customCampaignId} (Ch:${channel.id})` 
                : `API Direct Dispatch ${finalCampaignId} (Ch:${channel.id})`;

            // Step A: Stage Contacts locally
            try {
                const values = contacts.map(c => {
                    const varsJson = c.variables ? JSON.stringify(c.variables) : null;
                    return [finalCampaignId, req.user.id, c.phone, 'staged', varsJson];
                });
                await query(
                    'INSERT IGNORE INTO api_campaign_queue (campaign_id, user_id, mobile, status, variables) VALUES ?',
                    [values]
                );
            } catch (dbErr) {
                console.warn('[WA-API] Local DB mirror for add-contacts failed:', dbErr.message);
            }

            // Step B: Stage Contacts on Baileys Server
            await axios.post(`${EXTERNAL_BASE_URL}/api/campaign/add-contacts`, {
                campaign_id: finalCampaignId,
                user_id: req.user.id,
                contacts: contacts
            });

            // Step C: Start Campaign
            let payload = {};
            if (isTemplate) {
                payload = { templateId: parseInt(templateId) };
            } else {
                payload = { messageTemplate: messageContent };
            }

            payload.sessionName = `session${channel.id}`;
            if (imageUrl) payload.imageUrl = imageUrl;

            const baseApiUrl = process.env.API_BASE_URL || 'https://notifynow.in';
            payload.webhookUrl = `${baseApiUrl}/api/webhooks/wa-unofficial/callback`;

            console.log(`[WA-API] Firing campaign execution for ${finalCampaignId} on channel ${channel.id}...`);
            const campaignResponse = await axios.post(`${EXTERNAL_BASE_URL}/api/campaign/start/${finalCampaignId}`, payload);

            // Step D: Log to DB for user dashboard tracking
            try {
                for (const recipientObj of contacts) {
                    const recipient = recipientObj.phone;
                    await query(
                        'INSERT INTO api_message_logs (user_id, campaign_id, campaign_name, template_name, message_id, recipient, status, send_time, channel, message_content) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?)',
                        [
                            req.user.id,
                            finalCampaignId,
                            campaignName,
                            isTemplate ? `Template ID: ${templateId}` : 'Plain Text API',
                            `MSG_${Date.now()}_${recipient}`,
                            recipient,
                            'sent',
                            'WhatsApp_Unofficial',
                            messageContent || `Template ID: ${templateId}`
                        ]
                    );
                }
            } catch (logErr) {
                console.error('[WA-API] Error saving message logs:', logErr.message);
            }

            dispatchResults.push({
                channelId: channel.id,
                channelName: channel.name,
                campaignId: finalCampaignId,
                recipientCount: contacts.length,
                providerResponse: campaignResponse.data
            });
        }

        res.json({
            success: true,
            message: activeGroups.length > 1
                ? 'WhatsApp message dispatch initiated successfully with round-robin rotation.'
                : 'WhatsApp message dispatch initiated successfully.',
            campaignId: dispatchResults[0].campaignId,
            recipientCount: contactsArray.length,
            channelUsed: activeGroups.length > 1
                ? dispatchResults.map(d => `${d.channelName} (${d.recipientCount})`).join(', ')
                : dispatchResults[0].channelName,
            dispatches: dispatchResults
        });

    } catch (err) {
        console.error('Send Message API Error:', err.response?.data || err.message);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to process WhatsApp send: ' + (err.response?.data?.message || err.message) 
        });
    }
});

/**
 * @route   GET /api/wa-unofficial-v1/campaigns/:campaignId/status
 * @desc    Get status of an API initiated WhatsApp campaign/sendout
 * @access  Private (Developer)
 */
router.all('/campaigns/:campaignId/status', authenticateDeveloper, async (req, res) => {
    const campaignId = req.params.campaignId;

    try {
        const response = await axios.get(`${EXTERNAL_BASE_URL}/api/campaign/${campaignId}/status`);
        res.json(response.data);
    } catch (err) {
        console.error('Get Campaign Status API Error:', err.response?.data || err.message);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch status: ' + (err.response?.data?.message || err.message) 
        });
    }
});

/**
 * @route   GET /api/wa-unofficial-v1/campaigns/:campaignId/analytics
 * @desc    Get performance analytics of an API initiated WhatsApp campaign
 * @access  Private (Developer)
 */
router.all('/campaigns/:campaignId/analytics', authenticateDeveloper, async (req, res) => {
    const campaignId = req.params.campaignId;

    try {
        const response = await axios.get(`${EXTERNAL_BASE_URL}/api/campaign/${campaignId}/analytics`);
        res.json(response.data);
    } catch (err) {
        console.error('Get Campaign Analytics API Error:', err.response?.data || err.message);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch analytics: ' + (err.response?.data?.message || err.message) 
        });
    }
});

/**
 * @route   GET /api/wa-unofficial-v1/campaigns/:campaignId/logs
 * @desc    Get detailed recipient logs for an API initiated WhatsApp campaign
 * @access  Private (Developer)
 */
router.all('/campaigns/:campaignId/logs', authenticateDeveloper, async (req, res) => {
    const campaignId = req.params.campaignId;

    try {
        const [logs] = await query(
            'SELECT id, recipient, status, message_content, send_time, delivery_time FROM api_message_logs WHERE user_id = ? AND campaign_id = ? ORDER BY id DESC',
            [req.user.id, campaignId]
        );
        res.json({
            success: true,
            campaignId,
            total: logs.length,
            logs
        });
    } catch (err) {
        console.error('Get Campaign Logs API Error:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch campaign logs: ' + err.message 
        });
    }
});

/**
 * @route   GET /api/wa-unofficial-v1/templates
 * @desc    List all templates for the authenticated developer
 * @access  Private (Developer)
 */
router.get('/templates', authenticateDeveloper, async (req, res) => {
    try {
        const response = await axios.get(`${EXTERNAL_BASE_URL}/api/template/templates/user/${req.user.id}`);
        res.json(response.data);
    } catch (err) {
        console.error('List Developer Templates Error:', err.response?.data || err.message);
        res.status(err.response?.status || 500).json(
            err.response?.data || { success: false, message: 'Failed to list templates: ' + err.message }
        );
    }
});

/**
 * @route   POST /api/wa-unofficial-v1/templates
 * @desc    Create/Save a new message template
 * @access  Private (Developer)
 */
router.post('/templates', authenticateDeveloper, async (req, res) => {
    const {
        template_name,
        template_type = 'plainText',
        template_content,
        variables = [],
        preview_text = '',
        template_data = {}
    } = req.body;

    if (!template_name || !template_content) {
        return res.status(400).json({ success: false, message: 'template_name and template_content are required.' });
    }

    try {
        const payload = {
            user_id: req.user.id,
            template_name,
            template_type,
            template_content,
            variables,
            template_data
        };

        if (preview_text) {
            payload.preview_text = preview_text;
        }

        const response = await axios.post(`${EXTERNAL_BASE_URL}/api/template/save`, payload);
        res.status(201).json(response.data);
    } catch (err) {
        console.error('Create Developer Template Error:', err.response?.data || err.message);
        res.status(err.response?.status || 500).json(
            err.response?.data || { success: false, message: 'Failed to create template: ' + (err.response?.data?.error || err.message) }
        );
    }
});

/**
 * @route   DELETE /api/wa-unofficial-v1/templates/:templateId
 * @desc    Delete a message template
 * @access  Private (Developer)
 */
router.delete('/templates/:templateId', authenticateDeveloper, async (req, res) => {
    const templateId = req.params.templateId;
    try {
        const response = await axios.delete(`${EXTERNAL_BASE_URL}/api/template/templates/${templateId}`, {
            data: { user_id: req.user.id }
        });
        res.json(response.data);
    } catch (err) {
        console.error('Delete Developer Template Error:', err.response?.data || err.message);
        res.status(err.response?.status || 500).json(
            err.response?.data || { success: false, message: 'Failed to delete template: ' + err.message }
        );
    }
});

module.exports = router;
