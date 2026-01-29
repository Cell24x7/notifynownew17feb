const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

// Ensure we use the promise-based pool exported by server/database.js
let pool = global.dbPool;
try {
    const dbModule = require('../database');
    // support both ESM default export and CommonJS
    pool = pool || dbModule.default || dbModule;
} catch (err) {
    pool = pool || global.dbPool;
}

// GET all RCS templates
router.get('/templates', async (req, res) => {
    try {
        const connection = await pool.promise().getConnection();

        const query = `
      SELECT 
        t.id,
        t.name,
        t.language,
        t.category,
        t.status,
        t.header_type,
        t.header_content,
        t.body,
        t.footer,
        t.created_by,
        t.created_at,
        t.updated_at,
        t.rejection_reason,
        COUNT(DISTINCT b.id) as button_count,
        COUNT(DISTINCT v.id) as variable_count
      FROM rcs_templates t
      LEFT JOIN rcs_template_buttons b ON t.id = b.template_id
      LEFT JOIN rcs_template_variables v ON t.id = v.template_id
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `;

        const [results] = await connection.query(query);
        connection.release();

        // Fetch full details for each template
        const templatesWithDetails = await Promise.all(
            results.map(async (template) => {
                return await getTemplateDetails(template.id);
            })
        );

        res.json(templatesWithDetails);
    } catch (error) {
        console.error('Error fetching templates:', error);
        res.status(500).json({ error: 'Failed to fetch templates' });
    }
});

// GET single template by ID
router.get('/templates/:id', async (req, res) => {
    try {
        const template = await getTemplateDetails(req.params.id);

        if (!template) {
            return res.status(404).json({ error: 'Template not found' });
        }

        res.json(template);
    } catch (error) {
        console.error('Error fetching template:', error);
        res.status(500).json({ error: 'Failed to fetch template' });
    }
});

// CREATE new RCS template
router.post('/templates', async (req, res) => {
    try {
        const {
            name,
            language,
            category,
            header_type,
            header_content,
            body,
            footer,
            status = 'draft',
            buttons = [],
            variables = [],
            created_by
        } = req.body;

        // Validate required fields
        if (!name || !language || !category || !body) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const connection = await pool.promise().getConnection();

        try {
            await connection.beginTransaction();

            // Generate UUID for template
            const templateId = uuidv4();

            // Insert template
            const insertQuery = `
        INSERT INTO rcs_templates 
        (id, name, language, category, status, header_type, header_content, body, footer, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

            await connection.query(insertQuery, [
                templateId,
                name,
                language,
                category,
                status,
                header_type || 'none',
                header_content || null,
                body,
                footer || null,
                created_by || 'system'
            ]);

            // Insert buttons
            if (buttons.length > 0) {
                const buttonQuery = `
          INSERT INTO rcs_template_buttons 
          (template_id, type, action_type, display_text, uri, position)
          VALUES (?, ?, ?, ?, ?, ?)
        `;

                for (const button of buttons) {
                    await connection.query(buttonQuery, [
                        templateId,
                        button.type,
                        button.actionType || null,
                        button.displayText,
                        button.uri || null,
                        button.position
                    ]);
                }
            }

            // Insert variables
            if (variables.length > 0) {
                const variableQuery = `
          INSERT INTO rcs_template_variables 
          (template_id, name, sample_value)
          VALUES (?, ?, ?)
        `;

                for (const variable of variables) {
                    await connection.query(variableQuery, [
                        templateId,
                        variable.name,
                        variable.sampleValue || ''
                    ]);
                }
            }

            // Initialize analytics
            const analyticsQuery = `
        INSERT INTO rcs_template_analytics 
        (template_id, total_sent, total_read, total_clicked)
        VALUES (?, 0, 0, 0)
      `;
            await connection.query(analyticsQuery, [templateId]);

            await connection.commit();
            connection.release();

            // Fetch and return created template
            const createdTemplate = await getTemplateDetails(templateId);
            res.status(201).json(createdTemplate);

        } catch (error) {
            await connection.rollback();
            connection.release();
            throw error;
        }
    } catch (error) {
        console.error('Error creating template:', error);
        res.status(500).json({ error: 'Failed to create template' });
    }
});

// UPDATE RCS template
router.put('/templates/:id', async (req, res) => {
    try {
        const {
            name,
            language,
            category,
            header_type,
            header_content,
            body,
            footer,
            status,
            buttons = [],
            variables = []
        } = req.body;

        const connection = await pool.promise().getConnection();

        try {
            await connection.beginTransaction();

            // Update template
            const updateQuery = `
        UPDATE rcs_templates 
        SET name = ?, language = ?, category = ?, status = ?,
            header_type = ?, header_content = ?, body = ?, footer = ?,
            updated_at = NOW()
        WHERE id = ?
      `;

            await connection.query(updateQuery, [
                name,
                language,
                category,
                status,
                header_type || 'none',
                header_content || null,
                body,
                footer || null,
                req.params.id
            ]);

            // Delete old buttons and insert new ones
            await connection.query('DELETE FROM rcs_template_buttons WHERE template_id = ?', [req.params.id]);

            if (buttons.length > 0) {
                const buttonQuery = `
          INSERT INTO rcs_template_buttons 
          (template_id, type, action_type, display_text, uri, position)
          VALUES (?, ?, ?, ?, ?, ?)
        `;

                for (const button of buttons) {
                    await connection.query(buttonQuery, [
                        req.params.id,
                        button.type,
                        button.actionType || null,
                        button.displayText,
                        button.uri || null,
                        button.position
                    ]);
                }
            }

            // Delete old variables and insert new ones
            await connection.query('DELETE FROM rcs_template_variables WHERE template_id = ?', [req.params.id]);

            if (variables.length > 0) {
                const variableQuery = `
          INSERT INTO rcs_template_variables 
          (template_id, name, sample_value)
          VALUES (?, ?, ?)
        `;

                for (const variable of variables) {
                    await connection.query(variableQuery, [
                        req.params.id,
                        variable.name,
                        variable.sampleValue || ''
                    ]);
                }
            }

            await connection.commit();
            connection.release();

            const updatedTemplate = await getTemplateDetails(req.params.id);
            res.json(updatedTemplate);

        } catch (error) {
            await connection.rollback();
            connection.release();
            throw error;
        }
    } catch (error) {
        console.error('Error updating template:', error);
        res.status(500).json({ error: 'Failed to update template' });
    }
});

// DELETE RCS template
router.delete('/templates/:id', async (req, res) => {
    try {
        const connection = await pool.promise().getConnection();

        try {
            await connection.beginTransaction();

            // Delete related records
            await connection.query('DELETE FROM rcs_template_buttons WHERE template_id = ?', [req.params.id]);
            await connection.query('DELETE FROM rcs_template_variables WHERE template_id = ?', [req.params.id]);
            await connection.query('DELETE FROM rcs_template_analytics WHERE template_id = ?', [req.params.id]);
            await connection.query('DELETE FROM rcs_template_approvals WHERE template_id = ?', [req.params.id]);

            // Delete template
            await connection.query('DELETE FROM rcs_templates WHERE id = ?', [req.params.id]);

            await connection.commit();
            connection.release();

            res.json({ success: true, message: 'Template deleted' });

        } catch (error) {
            await connection.rollback();
            connection.release();
            throw error;
        }
    } catch (error) {
        console.error('Error deleting template:', error);
        res.status(500).json({ error: 'Failed to delete template' });
    }
});

// APPROVE template
router.put('/templates/:id/approve', async (req, res) => {
    try {
        const connection = await pool.promise().getConnection();

        const updateQuery = `
      UPDATE rcs_templates 
      SET status = 'approved', updated_at = NOW()
      WHERE id = ?
    `;

        await connection.query(updateQuery, [req.params.id]);

        // Log approval
        const approvalQuery = `
      INSERT INTO rcs_template_approvals 
      (template_id, status, approved_by, approved_at)
      VALUES (?, 'approved', ?, NOW())
    `;

        await connection.query(approvalQuery, [
            req.params.id,
            req.body.approved_by || 'system'
        ]);

        connection.release();

        const updatedTemplate = await getTemplateDetails(req.params.id);
        res.json(updatedTemplate);

    } catch (error) {
        console.error('Error approving template:', error);
        res.status(500).json({ error: 'Failed to approve template' });
    }
});

// REJECT template
router.put('/templates/:id/reject', async (req, res) => {
    try {
        const { rejection_reason, rejected_by } = req.body;

        const connection = await pool.promise().getConnection();

        const updateQuery = `
      UPDATE rcs_templates 
      SET status = 'rejected', rejection_reason = ?, updated_at = NOW()
      WHERE id = ?
    `;

        await connection.query(updateQuery, [
            rejection_reason || '',
            req.params.id
        ]);

        // Log rejection
        const rejectionQuery = `
      INSERT INTO rcs_template_approvals 
      (template_id, status, rejection_reason, rejected_by, rejected_at)
      VALUES (?, 'rejected', ?, ?, NOW())
    `;

        await connection.query(rejectionQuery, [
            req.params.id,
            rejection_reason || '',
            rejected_by || 'system'
        ]);

        connection.release();

        const updatedTemplate = await getTemplateDetails(req.params.id);
        res.json(updatedTemplate);

    } catch (error) {
        console.error('Error rejecting template:', error);
        res.status(500).json({ error: 'Failed to reject template' });
    }
});

// GET templates by status
router.get('/templates/status/:status', async (req, res) => {
    try {
        const connection = await pool.promise().getConnection();

        const query = `
      SELECT id FROM rcs_templates 
      WHERE status = ?
      ORDER BY created_at DESC
    `;

        const [results] = await connection.query(query, [req.params.status]);
        connection.release();

        const templates = await Promise.all(
            results.map(t => getTemplateDetails(t.id))
        );

        res.json(templates);
    } catch (error) {
        console.error('Error fetching templates by status:', error);
        res.status(500).json({ error: 'Failed to fetch templates' });
    }
});

// GET pending templates (for approval)
router.get('/templates/pending/approval', async (req, res) => {
    try {
        const connection = await pool.promise().getConnection();

        const query = `
      SELECT id FROM rcs_templates 
      WHERE status IN ('draft', 'pending_approval')
      ORDER BY created_at DESC
    `;

        const [results] = await connection.query(query);
        connection.release();

        const templates = await Promise.all(
            results.map(t => getTemplateDetails(t.id))
        );

        res.json(templates);
    } catch (error) {
        console.error('Error fetching pending templates:', error);
        res.status(500).json({ error: 'Failed to fetch pending templates' });
    }
});

// Helper function to get complete template details
async function getTemplateDetails(templateId) {
    try {
        const connection = await pool.promise().getConnection();

        // Get template
        const templateQuery = 'SELECT * FROM rcs_templates WHERE id = ?';
        const [templates] = await connection.query(templateQuery, [templateId]);

        if (templates.length === 0) {
            connection.release();
            return null;
        }

        const template = templates[0];

        // Get buttons
        const buttonsQuery = 'SELECT * FROM rcs_template_buttons WHERE template_id = ? ORDER BY position';
        const [buttons] = await connection.query(buttonsQuery, [templateId]);

        // Get variables
        const variablesQuery = 'SELECT * FROM rcs_template_variables WHERE template_id = ?';
        const [variables] = await connection.query(variablesQuery, [templateId]);

        // Get analytics
        const analyticsQuery = 'SELECT * FROM rcs_template_analytics WHERE template_id = ?';
        const [analytics] = await connection.query(analyticsQuery, [templateId]);

        connection.release();

        return {
            id: template.id,
            name: template.name,
            language: template.language,
            category: template.category,
            status: template.status,
            headerType: template.header_type,
            headerContent: template.header_content,
            body: template.body,
            footer: template.footer,
            rejectionReason: template.rejection_reason,
            createdBy: template.created_by,
            createdAt: template.created_at,
            updatedAt: template.updated_at,
            buttons: buttons.map(b => ({
                id: b.id,
                type: b.type,
                actionType: b.action_type,
                displayText: b.display_text,
                uri: b.uri,
                position: b.position
            })),
            variables: variables.map(v => ({
                id: v.id,
                name: v.name,
                sampleValue: v.sample_value
            })),
            analytics: analytics.length > 0 ? {
                totalSent: analytics[0].total_sent,
                totalRead: analytics[0].total_read,
                totalClicked: analytics[0].total_clicked,
                conversionRate: analytics[0].total_clicked / Math.max(analytics[0].total_sent, 1)
            } : null
        };
    } catch (error) {
        console.error('Error getting template details:', error);
        return null;
    }
}

module.exports = router;
