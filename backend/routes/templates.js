const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const jwt = require('jsonwebtoken');
const viRbmService = require('../services/viRbmService');

// Middleware to authenticate token (using common pattern in project)
const authenticateToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });

    jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey123', (err, decoded) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.user = decoded;
        next();
    });
};

// GET all templates for ADMIN (all users)
router.get('/admin', authenticateToken, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
            return res.status(403).json({ success: false, message: 'Admin access required' });
        }

        // Get all templates from all users
        const [templates] = await query(`
            SELECT mt.*, u.email as user_email, u.name as user_name 
            FROM message_templates mt
            LEFT JOIN users u ON mt.user_id = u.id
            ORDER BY mt.created_at DESC
        `);

        // Fetch buttons for each template
        const templatesWithButtons = await Promise.all(templates.map(async (t) => {
            const [buttons] = await query('SELECT * FROM template_buttons WHERE template_id = ? ORDER BY position', [t.id]);
            return { ...t, buttons };
        }));

        res.json({ success: true, templates: templatesWithButtons });
    } catch (error) {
        console.error('Get admin templates error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch templates' });
    }
});

// GET all templates for current user
router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const [templates] = await query('SELECT * FROM message_templates WHERE user_id = ? ORDER BY created_at DESC', [userId]);

        // Fetch buttons for each template
        const templatesWithButtons = await Promise.all(templates.map(async (t) => {
            const [buttons] = await query('SELECT * FROM template_buttons WHERE template_id = ? ORDER BY position', [t.id]);
            return { ...t, buttons };
        }));

        res.json({ success: true, templates: templatesWithButtons });
    } catch (error) {
        console.error('Get templates error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch templates' });
    }
});

// CREATE new template
router.post('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            name, language, category, channel, template_type,
            header_type, header_content, body, footer, status, buttons
        } = req.body;

        const templateId = `TPL${Date.now()}`;

        await query(
            `INSERT INTO message_templates 
      (id, user_id, name, language, category, channel, template_type, header_type, header_content, body, footer, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [templateId, userId, name, language, category, channel, template_type, header_type, header_content || null, body, footer || null, status || 'pending']
        );

        // Insert buttons if any
        if (buttons && Array.isArray(buttons)) {
            for (const btn of buttons) {
                await query(
                    `INSERT INTO template_buttons (id, template_id, type, label, value, position)
          VALUES (?, ?, ?, ?, ?, ?)`,
                    [`BTN${Date.now()}${Math.random().toString(36).substr(2, 5)}`, templateId, btn.type, btn.label, btn.value || null, btn.position || 0]
                );
            }
        }

        // --- Vi RBM Integration ---
        // If channel is RCS, define and submit to Vi RBM
        if (channel === 'rcs') {
            try {
                console.log('📤 Processing RCS Template for Vi RBM:', name);

                // Construct payload expected by viRbmService
                // Note: Generic templates might differ in structure slightly, mapping accordingly
                const richTemplateData = {
                    name: name,
                    type: template_type === 'carousel' ? 'carousel' : (template_type === 'rich_card' ? 'rich_card' : 'text_message'), // Default to text_message if standard
                    // botId is handled by service URL construction

                    // Text Message Mapping
                    ...(template_type === 'standard' && {
                        type: 'text_message', // 'standard' in generic => 'text_message' in RCS
                        textMessageContent: body,
                        suggestions: (buttons || []).map(b => ({
                            suggestionType: b.type === 'quick_reply' ? 'reply' :
                                b.type === 'url' ? 'url_action' :
                                    b.type === 'phone' ? 'dialer_action' : 'reply',
                            displayText: b.label,
                            postback: b.value || b.label,
                            ...(b.type === 'url' && { url: b.value }),
                            ...(b.type === 'phone' && { phoneNumber: b.value })
                        }))
                    }),

                    // Carousel Mapping (if generic supports it structure)
                    ...(template_type === 'carousel' && {
                        // Assuming generic carousel payload structure matches or we need data from body/metadata?
                        // Current generic 'message_templates' schema is flat. 
                        // If complex data is needed (cards), it might be in 'body' as JSON or 'metadata' if added.
                        // For now, handling 'standard' (Text + Media Header) -> Rich Card
                        ...(header_type !== 'none' && {
                            type: 'rich_card',
                            orientation: 'VERTICAL',
                            height: 'MEDIUM_HEIGHT',
                            standAlone: {
                                cardTitle: name,
                                cardDescription: body,
                                mediaUrl: header_content, // header content as media
                                suggestions: (buttons || []).map(b => ({
                                    suggestionType: b.type === 'quick_reply' ? 'reply' :
                                        b.type === 'url' ? 'url_action' :
                                            b.type === 'phone' ? 'dialer_action' : 'reply',
                                    displayText: b.label,
                                    postback: b.value || b.label,
                                    ...(b.type === 'url' && { url: b.value }),
                                    ...(b.type === 'phone' && { phoneNumber: b.value })
                                }))
                            }
                        })
                    })
                };

                // If it was standard but had media header, we treated it as rich_card above.
                // If it was standard text only, it stays text_message.

                console.log('📤 Submitting to Vi RBM API...');
                const rbmResponse = await viRbmService.submitTemplate(richTemplateData);
                console.log('✅ Vi RBM Response:', rbmResponse);

                // Auto-update status if RBM returns it
                if (rbmResponse && rbmResponse.status) { // Assuming response has status field
                    const newStatus = rbmResponse.status === 'APPROVED' ? 'approved' :
                        rbmResponse.status === 'REJECTED' ? 'rejected' : 'pending';

                    await query('UPDATE message_templates SET status = ? WHERE id = ?', [newStatus, templateId]);
                }

            } catch (rbmError) {
                console.error('⚠️ Failed to submit to Vi RBM:', rbmError.message || rbmError);
                // We don't fail the request, but status remains 'pending' (pending submission retry maybe?)
            }
        }

        res.status(201).json({ success: true, message: 'Template created successfully', templateId });
    } catch (error) {
        console.error('Create template error:', error);
        res.status(500).json({ success: false, message: 'Failed to create template', error: error.message });
    }
});

// UPDATE template
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const {
            name, language, category, channel, template_type,
            header_type, header_content, body, footer, status, buttons
        } = req.body;

        // Check ownership
        const [existing] = await query('SELECT id FROM message_templates WHERE id = ? AND user_id = ?', [id, userId]);
        if (existing.length === 0) return res.status(404).json({ success: false, message: 'Template not found' });

        await query(
            `UPDATE message_templates SET 
        name = ?, language = ?, category = ?, channel = ?, template_type = ?,
        header_type = ?, header_content = ?, body = ?, footer = ?, status = ?
      WHERE id = ? AND user_id = ?`,
            [name, language, category, channel, template_type, header_type, header_content, body, footer, status, id, userId]
        );

        // Update buttons: delete and re-insert
        await query('DELETE FROM template_buttons WHERE template_id = ?', [id]);
        if (buttons && Array.isArray(buttons)) {
            for (const btn of buttons) {
                await query(
                    `INSERT INTO template_buttons (id, template_id, type, label, value, position)
          VALUES (?, ?, ?, ?, ?, ?)`,
                    [`BTN${Date.now()}${Math.random().toString(36).substr(2, 5)}`, id, btn.type, btn.label, btn.value, btn.position || 0]
                );
            }
        }

        res.json({ success: true, message: 'Template updated successfully' });
    } catch (error) {
        console.error('Update template error:', error);
        res.status(500).json({ success: false, message: 'Failed to update template' });
    }
});


// ADMIN: Update template status (Approve/Reject)
router.patch('/:id/status', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, rejection_reason } = req.body;

        console.log('📝 Template status update request:', {
            templateId: id,
            newStatus: status,
            userRole: req.user.role,
            userId: req.user.id
        });

        // Verify admin role
        if (req.user.role !== 'superadmin' && req.user.role !== 'admin') {
            console.log('❌ Access denied: User is not admin');
            return res.status(403).json({
                success: false,
                message: 'Admin access required to approve/reject templates'
            });
        }

        // Validate status
        const validStatuses = ['pending', 'approved', 'rejected', 'draft'];
        if (!validStatuses.includes(status)) {
            console.log('❌ Invalid status:', status);
            return res.status(400).json({
                success: false,
                message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
            });
        }

        // Check if template exists
        const [existing] = await query('SELECT id, name, status FROM message_templates WHERE id = ?', [id]);
        if (existing.length === 0) {
            console.log('❌ Template not found:', id);
            return res.status(404).json({
                success: false,
                message: 'Template not found'
            });
        }

        console.log('✅ Template found:', existing[0]);

        // Update status
        const result = await query(
            'UPDATE message_templates SET status = ?, rejection_reason = ?, updated_at = NOW() WHERE id = ?',
            [status, rejection_reason || null, id]
        );

        console.log('✅ Template status updated successfully:', {
            templateId: id,
            oldStatus: existing[0].status,
            newStatus: status,
            affectedRows: result[0].affectedRows
        });

        res.json({
            success: true,
            message: `Template ${status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'updated'} successfully`,
            template: {
                id,
                name: existing[0].name,
                status
            }
        });
    } catch (error) {
        console.error('❌ Update template status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update template status',
            error: error.message
        });
    }
});


// DELETE template
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        // Check if template exists and belongs to user (or user is admin)
        const [existing] = await query('SELECT id FROM message_templates WHERE id = ?', [id]);
        if (existing.length === 0) return res.status(404).json({ success: false, message: 'Template not found' });

        // If not admin, check ownership
        if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
            const [owned] = await query('SELECT id FROM message_templates WHERE id = ? AND user_id = ?', [id, userId]);
            if (owned.length === 0) return res.status(403).json({ success: false, message: 'Access denied' });
        }

        // Delete buttons first (foreign key)
        await query('DELETE FROM template_buttons WHERE template_id = ?', [id]);

        // Delete template
        await query('DELETE FROM message_templates WHERE id = ?', [id]);

        res.json({ success: true, message: 'Template deleted successfully' });
    } catch (error) {
        console.error('Delete template error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete template' });
    }
});

// SYNC template status (RCS only)
router.post('/:id/sync', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        // Get template
        const [templates] = await query('SELECT * FROM message_templates WHERE id = ?', [id]);
        if (templates.length === 0) return res.status(404).json({ success: false, message: 'Template not found' });

        const template = templates[0];

        // Check ownership (unless admin)
        if (req.user.role !== 'admin' && req.user.role !== 'superadmin' && template.user_id !== userId) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        if (template.channel !== 'rcs') {
            return res.status(400).json({ success: false, message: 'Sync only available for RCS templates' });
        }

        console.log('🔄 Syncing status for template:', template.name);

        try {
            // Get status from Vi RBM
            const rbmStatus = await viRbmService.getTemplateStatus(template.name);
            console.log('✅ Vi RBM Status:', rbmStatus);

            // Map RBM status to local status
            let localStatus = template.status;
            let rejectionReason = null;

            if (rbmStatus.status === 'APPROVED') {
                localStatus = 'approved';
            } else if (rbmStatus.status === 'REJECTED') {
                localStatus = 'rejected';
                rejectionReason = rbmStatus.reason || 'Rejected by Vi RBM';
            } else if (rbmStatus.status === 'PENDING') {
                localStatus = 'pending';
            }

            // Update local DB if changed
            if (localStatus !== template.status) {
                await query(
                    'UPDATE message_templates SET status = ?, rejection_reason = ?, updated_at = NOW() WHERE id = ?',
                    [localStatus, rejectionReason, id]
                );
                template.status = localStatus;
                template.rejection_reason = rejectionReason;
            }

            res.json({ success: true, message: 'Sync complete', template });

        } catch (rbmError) {
            console.error('⚠️ Failed to sync with Vi RBM:', rbmError.message || rbmError);
            res.status(502).json({ success: false, message: 'Failed to sync with Vi RBM', error: rbmError.message });
        }

    } catch (error) {
        console.error('Sync template error:', error);
        res.status(500).json({ success: false, message: 'Failed to sync template' });
    }
});

module.exports = router;
