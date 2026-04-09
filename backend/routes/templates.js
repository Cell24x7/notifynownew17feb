const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { v1: uuidv4 } = require('uuid'); // Added uuid for consistency if needed, though project uses Date.now()
const jwt = require('jsonwebtoken');
const { submitDotgoTemplate, getDotgoTemplateStatus } = require('../services/rcsService');

const authenticate = require('../middleware/authMiddleware');

// Auto-create table
(async () => {
    try {
        await query(`
            CREATE TABLE IF NOT EXISTS message_templates (
                id VARCHAR(100) PRIMARY KEY,
                user_id INT NOT NULL,
                whatsapp_config_id INT DEFAULT NULL,
                rcs_config_id INT DEFAULT NULL,
                name VARCHAR(255) NOT NULL,
                language VARCHAR(50) DEFAULT 'en',
                category VARCHAR(100) DEFAULT 'Marketing',
                channel VARCHAR(50) NOT NULL,
                template_type VARCHAR(50) DEFAULT 'text_message',
                header_type VARCHAR(50) DEFAULT 'none',
                header_content TEXT,
                body TEXT NOT NULL,
                footer TEXT,
                metadata JSON DEFAULT NULL,
                status VARCHAR(50) DEFAULT 'pending',
                rejection_reason TEXT,
                usage_count INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_user_id (user_id),
                INDEX idx_channel (channel),
                INDEX idx_status (status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        await query(`
            CREATE TABLE IF NOT EXISTS template_buttons (
                id VARCHAR(100) PRIMARY KEY,
                template_id VARCHAR(100) NOT NULL,
                type VARCHAR(50) NOT NULL,
                label VARCHAR(255) NOT NULL,
                value TEXT,
                position INT DEFAULT 0,
                INDEX idx_template_id (template_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        // Ensure metadata column exists
        await query(`ALTER TABLE message_templates ADD COLUMN IF NOT EXISTS metadata JSON DEFAULT NULL AFTER footer`);
        console.log('✓ message_templates table ready');
    } catch (err) {
        console.error('Error creating message_templates table:', err.message);
    }
})();

// GET all templates for ADMIN (all users) - with pagination
router.get('/admin', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
            return res.status(403).json({ success: false, message: 'Admin access required' });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        // 1. Get Platform Templates
        const [templates] = await query(`
            SELECT mt.*, u.email as user_email, u.name as user_name 
            FROM message_templates mt
            LEFT JOIN users u ON mt.user_id = u.id
            ORDER BY mt.created_at DESC
        `);

        const templatesWithButtons = await Promise.all(templates.map(async (t) => {
            const [buttons] = await query('SELECT * FROM template_buttons WHERE template_id = ? ORDER BY position', [t.id]);
            return { ...t, buttons };
        }));

        // 2. Get DLT Templates
        const [dltTemplates] = await query(`
            SELECT dlt.*, u.email as user_email, u.name as user_name 
            FROM dlt_templates dlt
            LEFT JOIN users u ON dlt.user_id = u.id
            ORDER BY dlt.created_at DESC
        `);
        const mappedDltTemplates = dltTemplates.map(t => ({
            id: `DLT_${t.id}`,
            user_id: t.user_id,
            user_email: t.user_email,
            user_name: t.user_name,
            name: t.temp_name || `${t.sender} - ${t.temp_id}`,
            language: 'en',
            category: t.temp_type || 'Marketing',
            channel: 'sms',
            template_type: 'text_message',
            header_type: 'text',
            header_content: t.sender,
            body: t.template_text,
            footer: null,
            status: t.status === 'Y' ? 'approved' : 'rejected',
            created_at: t.created_at,
            updated_at: t.updated_at,
            buttons: [],
            is_dlt: true
        }));

        // 3. Combine and Page
        const allTemplates = [...templatesWithButtons, ...mappedDltTemplates];
        const total = allTemplates.length;
        const totalPages = Math.ceil(total / limit);
        const paginatedTemplates = allTemplates.slice(offset, offset + limit);

        res.json({
            success: true,
            templates: paginatedTemplates,
            pagination: {
                total,
                page,
                limit,
                totalPages
            }
        });
    } catch (error) {
        console.error('Get admin templates error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch templates' });
    }
});

// GET all templates for current user (Filtered by active config) - with pagination
router.get('/', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        // Fetch user's current configurations
        const [users] = await query('SELECT whatsapp_config_id, rcs_config_id FROM users WHERE id = ?', [userId]);
        const userConfig = users[0] || { whatsapp_config_id: null, rcs_config_id: null };

        // 1. Get Platform Templates (WhatsApp, RCS, Internal SMS)
        const [templates] = await query(`
            SELECT * FROM message_templates 
            WHERE user_id = ? 
            AND (
                (channel = 'whatsapp' AND (whatsapp_config_id = ? OR whatsapp_config_id IS NULL)) OR
                (channel = 'rcs' AND (rcs_config_id = ? OR rcs_config_id IS NULL)) OR
                (channel NOT IN ('whatsapp', 'rcs'))
            )
            ORDER BY created_at DESC
        `, [userId, userConfig.whatsapp_config_id, userConfig.rcs_config_id]);

        const templatesWithButtons = await Promise.all(templates.map(async (t) => {
            const [buttons] = await query('SELECT * FROM template_buttons WHERE template_id = ? ORDER BY position', [t.id]);
            return { ...t, buttons };
        }));

        // 2. Get DLT Templates (SMS Only)
        const [dltTemplates] = await query('SELECT * FROM dlt_templates WHERE user_id = ?', [userId]);
        const mappedDltTemplates = dltTemplates.map(t => ({
            id: `DLT_${t.id}`,
            user_id: t.user_id,
            whatsapp_config_id: null,
            rcs_config_id: null,
            name: t.temp_name || `${t.sender} - ${t.temp_id}`,
            language: 'en',
            category: t.temp_type || 'Marketing',
            channel: 'sms',
            template_type: 'text_message',
            header_type: 'text',
            header_content: t.sender,
            body: t.template_text,
            footer: null,
            status: t.status === 'Y' ? 'approved' : 'rejected',
            rejection_reason: null,
            usage_count: 0,
            created_at: t.created_at,
            updated_at: t.updated_at,
            buttons: [],
            is_dlt: true,
            dlt_details: {
                sender: t.sender,
                temp_id: t.temp_id,
                pe_id: t.pe_id,
                hash_id: t.hash_id
            }
        }));

        // 3. Combine and Page
        const allTemplates = [...templatesWithButtons, ...mappedDltTemplates];
        
        // Handle Filtering (Simplified - full filtering is done on frontend but we should respect pagination)
        // Note: The UI prefers getting everything and filtering on frontend for small datasets, 
        // but if we have thousands of templates, we need better pagination.
        // For now, let's just combine and return.

        const total = allTemplates.length;
        const totalPages = Math.ceil(total / limit);
        const paginatedTemplates = allTemplates.slice(offset, offset + limit);

        res.json({
            success: true,
            templates: paginatedTemplates,
            pagination: {
                total,
                page,
                limit,
                totalPages
            }
        });
    } catch (error) {
        console.error('Get templates error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch templates' });
    }
});

// CREATE new template
router.post('/', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            name, language, category, channel, template_type,
            header_type, header_content, body, footer, status, buttons
        } = req.body;

        // Fetch user's current configs to link with template
        const [users] = await query('SELECT whatsapp_config_id, rcs_config_id FROM users WHERE id = ?', [userId]);
        const currentUser = users[0] || {};

        const templateId = `TPL${Date.now()}`;

        await query(
            `INSERT INTO message_templates 
      (id, user_id, whatsapp_config_id, rcs_config_id, name, language, category, channel, template_type, header_type, header_content, body, footer, metadata, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                templateId,
                userId,
                channel === 'whatsapp' ? currentUser.whatsapp_config_id : null,
                channel === 'rcs' ? currentUser.rcs_config_id : null,
                name, language, category, channel, template_type || 'text_message',
                header_type || 'none', header_content || null, body, footer || null, 
                req.body.metadata ? JSON.stringify(req.body.metadata) : null,
                status || 'pending'
            ]
        );

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
router.put('/:id', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const {
            name, language, category, channel, template_type,
            header_type, header_content, body, footer, status, buttons
        } = req.body;

        const [existing] = await query('SELECT id FROM message_templates WHERE id = ? AND user_id = ?', [id, userId]);
        if (existing.length === 0) return res.status(404).json({ success: false, message: 'Template not found' });

        await query(
            `UPDATE message_templates SET 
        name = ?, language = ?, category = ?, channel = ?, template_type = ?,
        header_type = ?, header_content = ?, body = ?, footer = ?, metadata = ?, status = ?
      WHERE id = ? AND user_id = ?`,
            [
                name, language, category, channel, template_type, 
                header_type, header_content, body, footer, 
                req.body.metadata ? JSON.stringify(req.body.metadata) : null,
                status, id, userId
            ]
        );

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
router.patch('/:id/status', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, rejection_reason } = req.body;

        if (req.user.role !== 'superadmin' && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Admin access required to approve/reject templates'
            });
        }

        const validStatuses = ['pending', 'approved', 'rejected', 'draft'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
            });
        }

        const [existing] = await query('SELECT id, name, status FROM message_templates WHERE id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Template not found'
            });
        }

        await query(
            'UPDATE message_templates SET status = ?, rejection_reason = ?, updated_at = NOW() WHERE id = ?',
            [status, rejection_reason || null, id]
        );

        res.json({
            success: true,
            message: `Template ${status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'updated'} successfully`,
            template: { id, name: existing[0].name, status }
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
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        // Handle DLT Template deletion
        if (id.startsWith('DLT_')) {
            const numericId = id.split('_')[1];
            
            // Check ownership unless admin
            if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
                const [owned] = await query('SELECT id FROM dlt_templates WHERE id = ? AND user_id = ?', [numericId, userId]);
                if (owned.length === 0) return res.status(403).json({ success: false, message: 'Access denied' });
            }
            
            await query('DELETE FROM dlt_templates WHERE id = ?', [numericId]);
            return res.json({ success: true, message: 'DLT Template deleted successfully' });
        }

        const [existing] = await query('SELECT id FROM message_templates WHERE id = ?', [id]);
        if (existing.length === 0) return res.status(404).json({ success: false, message: 'Template not found' });

        if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
            const [owned] = await query('SELECT id FROM message_templates WHERE id = ? AND user_id = ?', [id, userId]);
            if (owned.length === 0) return res.status(403).json({ success: false, message: 'Access denied' });
        }

        await query('DELETE FROM template_buttons WHERE template_id = ?', [id]);
        await query('DELETE FROM message_templates WHERE id = ?', [id]);

        res.json({ success: true, message: 'Template deleted successfully' });
    } catch (error) {
        console.error('Delete template error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete template' });
    }
});

// SYNC template status (RCS only) - Disabled as Vi RBM is removed
router.post('/:id/sync', authenticate, async (req, res) => {
    res.status(410).json({ success: false, message: 'Vi RBM sync is no longer available. Template status is managed via Dotgo.' });
});

/**
 * @route POST /api/templates/dotgo/submit
 * @desc Submit a template to Dotgo from local DB or directly
 */
router.post('/dotgo/submit', authenticate, async (req, res) => {
    try {
        const { templateData } = req.body;
        if (!templateData || !templateData.name) {
            return res.status(400).json({ success: false, message: 'Invalid template data' });
        }

        const result = await submitDotgoTemplate(templateData);
        if (result.success) {
            // Optionally update local DB status to 'submitted'
            await query('UPDATE message_templates SET status = "pending" WHERE name = ?', [templateData.name]);
            res.json(result);
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * @route GET /api/templates/dotgo/status/:name
 * @desc Check template approval status on Dotgo
 */
router.get('/dotgo/status/:name', authenticate, async (req, res) => {
    try {
        const { name } = req.params;
        const result = await getDotgoTemplateStatus(name);

        if (result.success && result.status) {
            // Update local DB if approved
            const localStatus = result.status.toLowerCase();
            await query('UPDATE message_templates SET status = ? WHERE name = ?', [localStatus, name]);
        }

        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET /api/templates/:id/sample - Download sample file for template variables
router.get('/:id/sample', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { format = 'csv' } = req.query;

        const [templates] = await query('SELECT * FROM message_templates WHERE id = ?', [id]);
        if (templates.length === 0) return res.status(404).json({ success: false, message: 'Template not found' });

        const t = templates[0];
        
        // Extract variables from body and header
        const combinedText = (t.header_content || '') + ' ' + (t.body || '');
        const varMatches = combinedText.match(/{{([^}]+)}}/g) || [];
        const uniqueVars = [...new Set(varMatches.map(v => v.replace(/{{|}}/g, '').trim()))];
        
        // Sort variables: numbered variables (1, 2, 3) first, then named ones
        uniqueVars.sort((a, b) => {
            const numA = parseInt(a);
            const numB = parseInt(b);
            if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
            if (!isNaN(numA)) return -1;
            if (!isNaN(numB)) return 1;
            return a.localeCompare(b);
        });

        // Prepare headers: mobile + variables
        const headers = ['mobile', ...uniqueVars];
        const sampleRow = { mobile: '91xxxxxxxxxx' };
        uniqueVars.forEach(v => {
            sampleRow[v] = isNaN(parseInt(v)) ? `[Value for ${v}]` : `[Value ${v}]`;
        });

        if (format === 'csv') {
            const { Parser } = require('json2csv');
            const parser = new Parser({ fields: headers });
            const csv = parser.parse([sampleRow]);
            res.header('Content-Type', 'text/csv');
            res.attachment(`Sample_${t.name.replace(/\s+/g, '_')}.csv`);
            return res.send(csv);
        } else {
            const ExcelJS = require('exceljs');
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Sample');
            worksheet.addRow(headers);
            worksheet.addRow(Object.values(sampleRow));
            
            res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.attachment(`Sample_${t.name.replace(/\s+/g, '_')}.xlsx`);
            return await workbook.xlsx.write(res);
        }

    } catch (error) {
        console.error('Sample download error:', error);
        res.status(500).json({ success: false, message: 'Failed to generate sample file' });
    }
});

module.exports = router;

