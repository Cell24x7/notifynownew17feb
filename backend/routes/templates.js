const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const jwt = require('jsonwebtoken');

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

        // Validate channel against user profile
        const [userRows] = await query('SELECT channels_enabled FROM users WHERE id = ?', [userId]);
        if (userRows.length === 0) return res.status(404).json({ success: false, message: 'User not found' });

        let enabledChannels = [];
        try {
            enabledChannels = userRows[0].channels_enabled
                ? JSON.parse(userRows[0].channels_enabled)
                : [];
        } catch (e) {
            console.error('Error parsing channels_enabled:', e);
            enabledChannels = [];
        }

        if (enabledChannels.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'No channels are enabled for your account. Please contact admin.'
            });
        }

        if (!enabledChannels.includes(channel)) {
            return res.status(403).json({ success: false, message: `Channel ${channel} is not enabled for this account` });
        }

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

module.exports = router;
