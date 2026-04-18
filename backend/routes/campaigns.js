const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { deductCampaignCredits } = require('../services/walletService');
const { calculateNextRun, processQueue } = require('../services/queueService');
const jwt = require('jsonwebtoken');
const ExcelJS = require('exceljs');
const path = require('path');


const authenticate = require('../middleware/authMiddleware');

// GET all campaigns for current user (with pagination)
router.get('/', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        // Get total count (Manual + API)
        const [totalResult] = await query(`
            SELECT (
                (SELECT COUNT(*) FROM campaigns WHERE user_id = ?) + 
                (SELECT COUNT(*) FROM api_campaigns WHERE user_id = ?)
            ) as total
        `, [userId, userId]);
        const total = totalResult[0]?.total || 0;

        // Get paginated data (Manual + API)
        const commonCols = "id, user_id, name, channel, template_id, status, created_at, recipient_count, audience_count, sent_count, delivered_count, read_count, failed_count";
        const [campaignsResult] = await query(`
            SELECT * FROM (
                SELECT ${commonCols} FROM campaigns WHERE user_id = ?
                UNION ALL
                SELECT ${commonCols} FROM api_campaigns WHERE user_id = ?
            ) as combined_campaigns
            ORDER BY created_at DESC LIMIT ? OFFSET ?
        `, [userId, userId, limit, offset]);

        res.json({
            success: true,
            campaigns: campaignsResult,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get campaigns error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch campaigns' });
    }
});

// GET all campaigns for admin (cross-user pagination)
router.get('/admin', authenticate, async (req, res) => {
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
        return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const searchQuery = req.query.search || '';
        const clientFilter = req.query.clientId || 'all';
        const channelFilter = req.query.channel || 'all';
        const statusFilter = req.query.status || 'all';

        let whereClause = 'WHERE 1=1';
        const params = [];

        if (searchQuery) {
            whereClause += ' AND (c.name LIKE ? OR u.name LIKE ?)';
            params.push(`%${searchQuery}%`, `%${searchQuery}%`);
        }
        if (clientFilter !== 'all') {
            whereClause += ' AND c.user_id = ?';
            params.push(clientFilter);
        }
        if (channelFilter !== 'all') {
            whereClause += ' AND c.channel = ?';
            params.push(channelFilter);
        }
        if (statusFilter !== 'all') {
            whereClause += ' AND c.status = ?';
            params.push(statusFilter);
        }

        // Get total count (Manual + API)
        const countSql = `
            SELECT COUNT(*) as total FROM (
                SELECT c.id FROM campaigns c JOIN users u ON c.user_id = u.id ${whereClause}
                UNION ALL
                SELECT c.id FROM api_campaigns c JOIN users u ON c.user_id = u.id ${whereClause}
            ) as combined_total
        `;
        const [countResult] = await query(countSql, [...params, ...params]);
        const total = countResult[0]?.total || 0;

        // Get paginated data with user details (Manual + API)
        const commonCols = "id, user_id, name, channel, template_id, status, created_at, recipient_count, audience_count, sent_count, delivered_count, read_count, failed_count";
        const sql = `
            SELECT * FROM (
                SELECT c.${commonCols.split(', ').join(', c.')}, u.name as clientName, u.email as clientEmail 
                FROM campaigns c 
                JOIN users u ON c.user_id = u.id 
                ${whereClause} 
                UNION ALL
                SELECT c.${commonCols.split(', ').join(', c.')}, u.name as clientName, u.email as clientEmail 
                FROM api_campaigns c 
                JOIN users u ON c.user_id = u.id 
                ${whereClause}
            ) as combined_campaigns 
            ORDER BY created_at DESC 
            LIMIT ? OFFSET ?
        `;
        const [campaignsResult] = await query(sql, [...params, ...params, limit, offset]);

        res.json({
            success: true,
            campaigns: campaignsResult,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get admin campaigns error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch global campaigns' });
    }
});

// GET single campaign
router.get('/:id', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const table = id.startsWith('CAMP_API_') ? 'api_campaigns' : 'campaigns';
        const [campaign] = await query(`SELECT * FROM ${table} WHERE id = ? AND user_id = ?`, [id, userId]);
        if (campaign.length === 0) return res.status(404).json({ success: false, message: 'Campaign not found' });
        res.json({ success: true, campaign: campaign[0] });
    } catch (error) {
        console.error('Get campaign error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch campaign' });
    }
});

// CREATE campaign
router.post('/', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            name, channel, template_id, template_name, audience_id, recipient_count,
            status, scheduled_at, variable_mapping,
            template_metadata, template_body, template_type,
            schedule_type, scheduling_mode, frequency, repeat_days, end_date,
            rcs_config_id, whatsapp_config_id, ai_voice_config_id,
            voice_audio_id, voice_retries, voice_interval,
            is_failover_enabled, failover_sms_template
        } = req.body;

        // Validate channel against user profile
        const [userRows] = await query('SELECT channels_enabled FROM users WHERE id = ?', [userId]);
        if (userRows.length === 0) return res.status(404).json({ success: false, message: 'User not found' });

        let enabledChannels = [];

        const rawChannels = userRows[0].channels_enabled;
        if (rawChannels) {
            if (typeof rawChannels === 'string') {
                if (rawChannels.startsWith('[') && rawChannels.endsWith(']')) {
                    try {
                        enabledChannels = JSON.parse(rawChannels);
                    } catch (e) {
                        enabledChannels = rawChannels.split(',').map(c => c.trim().replace(/"/g, ''));
                    }
                } else {
                    enabledChannels = rawChannels.split(',').map(c => c.trim().replace(/"/g, ''));
                }
            } else if (Array.isArray(rawChannels)) {
                enabledChannels = rawChannels;
            }
        }

        if (enabledChannels.length === 0) {
            console.warn(`User ${userId} has no channels enabled. Defaulting to all channels for compatibility.`);
            enabledChannels = ['whatsapp', 'sms', 'rcs', 'voicebot'];
            // return res.status(403).json({
            //     success: false,
            //     message: 'No channels are enabled for your account. Please contact admin or enable channels in Settings.'
            // });
        }

        // Fix: Auto-enable the requested channel if it's not in the list to prevent blocking
        if (channel && !enabledChannels.includes(channel)) {
            console.warn(`Channel ${channel} not enabled for user ${userId}. Auto-allowing for compatibility.`);
            enabledChannels.push(channel);
        }

        if (!enabledChannels.includes(channel)) {
            // This should barely be reachable now, but keeping as safeguard
            return res.status(403).json({ success: false, message: `Channel ${channel} is not enabled for this account` });
        }

        const campaignId = `CAMP${Date.now()}`;

        // Use provided template_name or fallback to template_id (if it looks like a name)
        const templateName = req.body.template_name || (isNaN(template_id) ? template_id : null);

        // Calculate next_run_at
        let nextRunAt = null;
        if (schedule_type === 'scheduled') {
            nextRunAt = scheduled_at;
        } else if (schedule_type === 'now') {
            nextRunAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
        }

        let finalMetadata = template_metadata || {};
        finalMetadata.is_unicode = req.body.is_unicode || false;
        finalMetadata.is_track_link = req.body.is_track_link || false;
        finalMetadata.sms_parts = req.body.sms_parts || 1;

        if (channel === 'voicebot' || channel === 'voice') {
            finalMetadata.audioId = voice_audio_id || template_id;
            finalMetadata.retries = voice_retries || 2;
            finalMetadata.retry_interval = voice_interval || 5;
        }

        let savedTemplateId = template_id || (channel === 'voicebot' ? voice_audio_id : null);

        if (channel === 'sms' && template_id) {
            try {
                // If template_id is our internal ID (e.g. DLT_123)
                let dltTplRows = [];
                if (String(template_id).startsWith('DLT_')) {
                    const internalId = template_id.replace('DLT_', '');
                    [dltTplRows] = await query('SELECT pe_id, hash_id, sender, temp_id FROM dlt_templates WHERE id = ? AND user_id = ? LIMIT 1', [internalId, userId]);
                } else {
                    // Fallback to numeric temp_id search (for direct API calls)
                    [dltTplRows] = await query('SELECT pe_id, hash_id, sender, temp_id FROM dlt_templates WHERE temp_id = ? AND user_id = ? LIMIT 1', [template_id, userId]);
                }

                if (dltTplRows.length > 0) {
                    const tpl = dltTplRows[0];
                    finalMetadata.peId = tpl.pe_id || finalMetadata.peId;
                    finalMetadata.hashId = tpl.hash_id || finalMetadata.hashId;
                    finalMetadata.sender = tpl.sender || finalMetadata.sender;
                    
                    // Always use the numeric DLT Template ID for the campaign record
                    if (tpl.temp_id) savedTemplateId = tpl.temp_id; 
                }
            } catch (err) {
                console.error('Error fetching DLT template metadata:', err.message);
            }
        }

        const [userConfigs] = await query('SELECT rcs_config_id, whatsapp_config_id, ai_voice_config_id FROM users WHERE id = ?', [userId]);
        const userRcsConfigId = userConfigs[0]?.rcs_config_id || null;
        const userWaConfigId = userConfigs[0]?.whatsapp_config_id || null;
        const userVoiceConfigId = userConfigs[0]?.ai_voice_config_id || null;

        await query(
            `INSERT INTO campaigns 
      (id, user_id, name, channel, template_id, template_name, audience_id, recipient_count, audience_count, status, 
       scheduled_at, variable_mapping, template_metadata, template_body, template_type,
       schedule_type, scheduling_mode, frequency, repeat_days, end_date, next_run_at,
       rcs_config_id, whatsapp_config_id, ai_voice_config_id,
       is_failover_enabled, failover_sms_template)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                campaignId, userId, name, channel, savedTemplateId, templateName,
                audience_id || null, recipient_count || 0, recipient_count || 0, status || 'draft',
                scheduled_at || null, JSON.stringify(variable_mapping || {}),
                JSON.stringify(finalMetadata),
                template_body || null,
                template_type || null,
                schedule_type || 'now',
                scheduling_mode || 'one-time',
                frequency || null,
                repeat_days ? JSON.stringify(repeat_days) : null,
                end_date || null,
                nextRunAt,
                rcs_config_id || userRcsConfigId,
                whatsapp_config_id || userWaConfigId,
                ai_voice_config_id || userVoiceConfigId,
                is_failover_enabled || 0,
                failover_sms_template || null
             ]
        );

        console.log(`✅ Campaign ${campaignId} created for user ${userId}. Template: ${templateName}. Schedule: ${schedule_type} (${scheduling_mode})`);
        res.status(201).json({ success: true, message: 'Campaign created successfully', campaignId });
    } catch (error) {
        console.error('CRITICAL: Create campaign error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create campaign',
            error: error.message
        });
    }
});


// UPDATE campaign status (Pause/Resume/Complete/Cancel)
router.patch('/:id/status', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const { status } = req.body;
        
        const allowedStatuses = ['running', 'paused', 'cancelled', 'sent', 'draft', 'completed'];
        if (!status || !allowedStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: `Invalid status. Allowed: ${allowedStatuses.join(', ')}` });
        }

        const table = id.startsWith('CAMP_API_') ? 'api_campaigns' : 'campaigns';

        // 1. Check existence and ownership
        const [existing] = await query(`SELECT id, status FROM ${table} WHERE id = ? AND user_id = ?`, [id, userId]);
        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'Campaign not found' });
        }

        const currentStatus = existing[0].status;

        // 2. If status is already the same, just return success
        if (currentStatus === status) {
            return res.json({ success: true, message: `Campaign is already ${status}` });
        }

        // 3. Deduction logic for 'running' state
        if (status === 'running') {
            const deductionResult = await deductCampaignCredits(id, table);
            if (!deductionResult.success) {
                return res.status(402).json({
                    success: false,
                    message: deductionResult.message || 'Insufficient wallet balance'
                });
            }
        }

        // 4. Update the status
        const [updateResult] = await query(`UPDATE ${table} SET status = ? WHERE id = ? AND user_id = ?`, [status, id, userId]);
        
        if (updateResult.affectedRows === 0) {
            return res.status(500).json({ success: false, message: 'Failed to update campaign status' });
        }

        console.log(`[Campaign] Status updated: ${id} (${table}) → ${status} (User: ${userId})`);
        res.json({ success: true, message: `Campaign status updated to ${status}` });

    } catch (error) {
        console.error('Update campaign status error:', error);
        res.status(500).json({ success: false, message: 'Failed to update campaign status' });
    }
});

// Alias PUT for backward compatibility
router.put('/:id/status', authenticate, async (req, res) => {
    // Forward to the PATCH handler logic
    const patchRoute = router.stack.find(s => s.route && s.route.path === '/:id/status' && s.route.methods.patch);
    if (patchRoute) return patchRoute.handle(req, res);
    res.status(500).json({ success: false, message: 'Status update handler error' });
});

// DUPLICATE campaign
router.post('/:id/duplicate', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const table = id.startsWith('CAMP_API_') ? 'api_campaigns' : 'campaigns';

        const [existing] = await query(`SELECT * FROM ${table} WHERE id = ? AND user_id = ?`, [id, userId]);
        if (existing.length === 0) return res.status(404).json({ success: false, message: 'Campaign not found' });

        const c = existing[0];
        const newId = `CAMP${Date.now()}`;
        const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        
        // Clean original name from previous (Copy) or (Resent) tags to avoid stacking
        let cleanName = c.name.replace(/\s*\(Copy\)/g, '').replace(/\s*\(Resent\)/g, '');
        const newName = `${req.user.name || 'User'} - ${dateStr} - ${cleanName} (Copy)`;

        await query(
            `INSERT INTO campaigns 
      (id, user_id, name, channel, template_id, template_name, audience_id, recipient_count, status, template_metadata, template_body, template_type, variable_mapping, is_failover_enabled, failover_sms_template)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                newId, userId, newName, c.channel, c.template_id, c.template_name,
                c.audience_id, c.recipient_count, 'draft',
                c.template_metadata, c.template_body, c.template_type, c.variable_mapping,
                c.is_failover_enabled, c.failover_sms_template
            ]
        );

        res.json({ success: true, message: 'Campaign duplicated successfully', campaignId: newId });
    } catch (error) {
        console.error('Duplicate campaign error:', error);
        res.status(500).json({ success: false, message: 'Failed to duplicate campaign' });
    }
});

// RESEND campaign (Duplicate + Send immediately to same recipients)
router.post('/:id/resend', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        // 1. Fetch original campaign
        const [existing] = await query('SELECT * FROM campaigns WHERE id = ? AND user_id = ?', [id, userId]);
        if (existing.length === 0) return res.status(404).json({ success: false, message: 'Campaign not found' });

        const c = existing[0];
        const newId = `CAMP${Date.now()}`;
        const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        
        // Clean original name from previous (Copy) or (Resent) tags to avoid stacking
        let cleanName = c.name.replace(/\s*\(Copy\)/g, '').replace(/\s*\(Resent\)/g, '');
        const newName = `${req.user.name || 'User'} - ${dateStr} - ${cleanName} (Resent)`;

        // 2. Insert new campaign record
        await query(
            `INSERT INTO campaigns 
      (id, user_id, name, channel, template_id, template_name, audience_id, recipient_count, audience_count, status, 
       variable_mapping, template_metadata, template_body, template_type, 
       schedule_type, scheduling_mode, next_run_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                newId, userId, newName, c.channel, c.template_id, c.template_name,
                c.audience_id, c.recipient_count, c.recipient_count, 'running',
                typeof c.variable_mapping === 'object' ? JSON.stringify(c.variable_mapping) : (c.variable_mapping || '{}'),
                typeof c.template_metadata === 'object' ? JSON.stringify(c.template_metadata) : (c.template_metadata || '{}'),
                c.template_body, c.template_type,
                'now', 'one-time', new Date().toISOString().slice(0, 19).replace('T', ' ')
            ]
        );

        // 3. Copy queue entries
        await query(
            `INSERT INTO campaign_queue (campaign_id, user_id, mobile, variables, status)
             SELECT ?, ?, mobile, variables, 'pending'
             FROM campaign_queue
             WHERE campaign_id = ?`,
            [newId, userId, id]
        );

        console.log(`🔄 Campaign ${id} resent as ${newId} (Recipients: ${c.recipient_count})`);

        // 4. Deduct credits
        try {
            const deductionResult = await deductCampaignCredits(newId);
            if (!deductionResult.success) {
                console.warn(`❌ Credit deduction failed for resent campaign ${newId}: ${deductionResult.message}`);
                await query('UPDATE campaigns SET status = "failed" WHERE id = ?', [newId]);
                return res.status(402).json({
                    success: false,
                    message: deductionResult.message || 'Insufficient wallet balance'
                });
            }
        } catch (creditErr) {
            console.error('❌ Wallet deduction exception for resend:', creditErr);
            // We continue as the campaign is already created, but it might stay failed
        }

        // 5. Trigger Sending immediately (instead of waiting 15s)
        try {
            processQueue().catch(err => console.error('Immediate queue trigger error:', err));
        } catch (qErr) {
            console.error('❌ Failed to trigger processQueue directly:', qErr);
        }
        
        console.log(`✅ Campaign ${id} successfully resent as ${newId}`);
        res.json({ success: true, message: 'Campaign re-triggered successfully', campaignId: newId });

    } catch (error) {
        console.error('❌ FATAL Resend campaign error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to resend campaign', 
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
        });
    }
});

// TEST SEND campaign
router.post('/test-send', authenticate, async (req, res) => {
    try {
        const { channel, template_id, destination, variables } = req.body;

        // Fetch template to get body
        const [templates] = await query('SELECT * FROM message_templates WHERE id = ?', [template_id]);
        if (templates.length === 0) return res.status(404).json({ success: false, message: 'Template not found' });

        let body = templates[0].body;

        // Replace variables and track links if WhatsApp
        const baseUrl = (process.env.API_BASE_URL || 'https://notifynow.in').replace(/\/api$/, '');
        // Standardized Link Tracking for Test Sends
        if (channel === 'whatsapp' && Array.isArray(processedVars)) {
            for (let i = 0; i < processedVars.length; i++) {
                let val = processedVars[i];
                if (typeof val === 'string' && val.match(/^https?:\/\/[^\s$.?#].[^\s]*$/i)) {
                    const trackingId = `tst_${mobile.replace(/\D/g, '')}_${Math.random().toString(36).substring(2, 8)}`;
                    try {
                        await query(
                            'INSERT INTO link_clicks (user_id, campaign_id, mobile, original_url, tracking_id) VALUES (?, ?, ?, ?, ?)',
                            [userId, 'TEST_SEND', mobile.replace(/\D/g, ''), val, trackingId]
                        );
                        processedVars[i] = `${baseUrl}/api/l/${trackingId}`;
                    } catch (e) { console.error('Test link tracking error:', e.message); }
                }
            }
        }

        if (variables) {
            const keys = Object.keys(variables);
            for (const key of keys) {
                let val = variables[key] || '';
                
                // Track if it's a URL in WhatsApp
                if (channel === 'whatsapp' && typeof val === 'string' && val.match(/^https?:\/\/[^\s$.?#].[^\s]*$/i)) {
                    const trackingId = `test_${Math.random().toString(36).substring(2, 10)}`;
                    try {
                        await query(
                            'INSERT INTO link_clicks (user_id, campaign_id, mobile, original_url, tracking_id) VALUES (?, ?, ?, ?, ?)',
                            [req.user.id, 'TEST_CAMPAIGN', mobile.replace(/\D/g, ''), val, trackingId]
                        );
                        val = `${baseUrl}/api/l/${trackingId}`;
                    } catch (e) { console.error('Test link error:', e.message); }
                }

                const regex = new RegExp(`{{${key}}}`, 'g');
                body = body.replace(regex, val);
            }
        }

        // Send logic (Simulated for now)
        // In a real implementation, this would call the respective provider API
        console.log(`[TEST SEND] channel=${channel}, to=${destination}, body=${body}`);

        // Return success with the rendered body
        res.json({ success: true, message: 'Test message sent successfully', preview: body });

    } catch (error) {
        console.error('Test send error:', error);
        res.status(500).json({ success: false, message: 'Failed to send test message' });
    }
});

// DELETE campaign
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const table = id.startsWith('CAMP_API_') ? 'api_campaigns' : 'campaigns';

        const [existing] = await query(`SELECT id FROM ${table} WHERE id = ? AND user_id = ?`, [id, userId]);
        if (existing.length === 0) return res.status(404).json({ success: false, message: 'Campaign not found' });

        await query(`DELETE FROM ${table} WHERE id = ? AND user_id = ?`, [id, userId]);
        res.json({ success: true, message: 'Campaign deleted successfully' });
    } catch (error) {
        console.error('Delete campaign error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete campaign' });
    }
});

// UPLOAD Contacts (Streaming)
// POST /api/campaigns/:id/upload-contacts
const upload = require('../middleware/upload');
const fs = require('fs');
const csv = require('csv-parser');

router.post('/:id/upload-contacts', authenticate, upload.single('file'), async (req, res) => {
    const campaignId = req.params.id;
    const userId = req.user.id;

    try {
        // Verify campaign exists
        const [existing] = await query('SELECT id, channel FROM campaigns WHERE id = ? AND user_id = ?', [campaignId, userId]);
        if (existing.length === 0) {
            // Cleanup uploaded file if campaign invalid
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(404).json({ success: false, message: 'Campaign not found' });
        }

        let contactCount = 0;
        const insertPromises = [];
        const BATCH_SIZE = 1000;
        let batch = [];

        const channel = existing[0]?.channel || 'rcs'; 
        const baseUrl = (process.env.API_BASE_URL || 'https://notifynow.in').replace(/\/api$/, '');

        const processBatch = async (currentBatch) => {
            if (currentBatch.length === 0) return;

            // UNIVERSAL LINK TRACKING ENGINE
            // Any URL found in variables for WhatsApp will be transformed
            if (channel === 'whatsapp') {
                for (const item of currentBatch) {
                    if (!item.variables) continue;
                    const keys = Object.keys(item.variables);
                    for (const k of keys) {
                        const val = item.variables[k];
                        if (typeof val === 'string' && val.match(/^https?:\/\/[^\s$.?#].[^\s]*$/i)) {
                            const trackingId = `clk_${Math.random().toString(36).substring(2, 10)}`;
                            try {
                                await query(
                                    'INSERT INTO link_clicks (user_id, campaign_id, mobile, original_url, tracking_id) VALUES (?, ?, ?, ?, ?)',
                                    [userId, campaignId, String(item.mobile).replace(/\D/g, ''), val, trackingId]
                                );
                                item.variables[k] = `${baseUrl}/api/l/${trackingId}`;
                            } catch (e) { console.error('Universal tracking error:', e.message); }
                        }
                    }
                }
            }

            const values = currentBatch.map(item => [campaignId, userId, item.mobile, JSON.stringify(item.variables), 'pending', channel]);
            await query('INSERT INTO campaign_queue (campaign_id, user_id, mobile, variables, status, channel) VALUES ?', [values]);
        };

        if (req.file) {
            const ext = path.extname(req.file.originalname).toLowerCase();
            
            if (ext === '.xlsx' || ext === '.xls') {
                const workbook = new ExcelJS.Workbook();
                await workbook.xlsx.readFile(req.file.path);
                const worksheet = workbook.getWorksheet(1);
                const headers = [];

                worksheet.getRow(1).eachCell((cell, colNumber) => {
                    const val = String(cell.value || '').trim();
                    if (val) headers[colNumber] = val;
                });

                const totalRows = worksheet.rowCount;
                for (let i = 2; i <= totalRows; i++) {
                    const row = worksheet.getRow(i);
                    const rowData = {};
                    let mobile = null;

                    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
                        const header = headers[colNumber];
                        if (header) {
                            rowData[header] = cell.value;
                            const lowerH = header.toLowerCase().replace(/\s/g, '').replace(/_/g, '');
                            const commonKeys = ['phone', 'mobile', 'number', 'recipient', 'contact', 'destination'];
                            if (commonKeys.includes(lowerH)) {
                                const m = String(cell.value || '').replace(/\D/g, '');
                                if (m.length >= 10) mobile = m;
                            }
                        }
                    });

                    if (!mobile) {
                       const first = String(row.getCell(1).value || '').replace(/\D/g, '');
                       if (first.length >= 10) mobile = first;
                    }

                    if (mobile) {
                        batch.push({ mobile, variables: rowData });
                        contactCount++;
                        if (batch.length >= 1000) {
                            await processBatch(batch);
                            batch = [];
                        }
                    }
                }
            } else {
                // Sequential CSV Processing (Stream-based)
                const stream = fs.createReadStream(req.file.path).pipe(csv());
                for await (const row of stream) {
                    let mobile = null;
                    const commonKeys = ['phone', 'mobile', 'number', 'recipient', 'contact', 'destination'];
                    const rowData = row;
                    
                    // Case-insensitive lookup for mobile
                    const keys = Object.keys(row);
                    for (const k of keys) {
                        const lowK = k.toLowerCase().replace(/\s/g, '').replace(/_/g, '');
                        if (commonKeys.includes(lowK)) {
                            const m = String(row[k] || '').replace(/\D/g, '');
                            if (m.length >= 10) { mobile = m; break; }
                        }
                    }

                    if (!mobile) {
                        const first = String(Object.values(row)[0] || '').replace(/\D/g, '');
                        if (first.length >= 10) mobile = first;
                    }

                    if (mobile) {
                        batch.push({ mobile, variables: rowData });
                        contactCount++;
                        if (batch.length >= 1000) {
                            await processBatch(batch);
                            batch = [];
                        }
                    }
                }
            }

            if (batch.length > 0) await processBatch(batch);
            if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

            await query('UPDATE campaigns SET recipient_count = COALESCE(recipient_count, 0) + ? WHERE id = ?', [contactCount, campaignId]);
            
            // Trigger Queue Immediately
            const { processQueue } = require('../services/queueService');
            processQueue().catch(e => console.error('Auto-trigger queue failed:', e.message));

            return res.json({ success: true, message: `Uploaded ${contactCount} contacts`, count: contactCount });

        } else if (req.body.manualNumbers) {
            let numbers = [];
            if (Array.isArray(req.body.manualNumbers)) {
                numbers = req.body.manualNumbers;
            } else if (typeof req.body.manualNumbers === 'string') {
                numbers = req.body.manualNumbers.split(/[\n,\s]+/).map(n => n.trim()).filter(Boolean);
            }

            for (const n of numbers) {
                const mobile = n.replace(/\D/g, '');
                if (mobile.length >= 10) {
                    const rowVariables = {}; // No manual variables from direct entry, but future-proof
                    
                    // Standardized variables for batch (Replacement now happens in processBatch)
                    if (req.body.variables) {
                        const keys = Object.keys(req.body.variables);
                        for (const k of keys) {
                            rowVariables[k] = req.body.variables[k];
                        }
                    }

                    batch.push({ mobile, variables: rowVariables });
                    contactCount++;
                    if (batch.length >= 1000) {
                        await processBatch(batch);
                        batch = [];
                    }
                }
            }
            if (batch.length > 0) await processBatch(batch);
            await query('UPDATE campaigns SET recipient_count = recipient_count + ? WHERE id = ?', [contactCount, campaignId]);
            
            // Trigger Queue Immediately for small manual campaigns
            const { processQueue } = require('../services/queueService');
            processQueue().catch(e => console.error('Auto-trigger queue failed:', e.message));

            return res.json({ success: true, message: `Added ${contactCount} contacts`, count: contactCount });
        } else {
            return res.status(400).json({ success: false, message: 'No file or numbers provided' });
        }

    } catch (error) {
        console.error('Upload contacts error:', error);
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(500).json({ success: false, message: 'Failed to upload contacts' });
    }
});



// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/campaigns/:id  — Delete a campaign and its queue items
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Check manual campaigns
        const [manualCheck] = await query('SELECT id FROM campaigns WHERE id = ? AND user_id = ?', [id, userId]);
        if (manualCheck.length > 0) {
            await query('DELETE FROM campaign_queue WHERE campaign_id = ?', [id]);
            await query('DELETE FROM message_logs WHERE campaign_id = ?', [id]);
            await query('DELETE FROM campaigns WHERE id = ? AND user_id = ?', [id, userId]);
            console.log(`[Campaign] Deleted manual campaign: ${id} (User: ${userId})`);
            return res.json({ success: true, message: 'Campaign deleted successfully' });
        }

        // Check API campaigns
        const [apiCheck] = await query('SELECT id FROM api_campaigns WHERE id = ? AND user_id = ?', [id, userId]);
        if (apiCheck.length > 0) {
            await query('DELETE FROM api_campaign_queue WHERE campaign_id = ?', [id]);
            await query('DELETE FROM api_message_logs WHERE campaign_id = ?', [id]);
            await query('DELETE FROM api_campaigns WHERE id = ? AND user_id = ?', [id, userId]);
            console.log(`[Campaign] Deleted API campaign: ${id} (User: ${userId})`);
            return res.json({ success: true, message: 'Campaign deleted successfully' });
        }

        return res.status(404).json({ success: false, message: 'Campaign not found or not authorized' });

    } catch (error) {
        console.error('Delete campaign error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete campaign' });
    }
});



module.exports = router;
