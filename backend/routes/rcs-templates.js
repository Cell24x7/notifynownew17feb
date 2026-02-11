const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/db');
const viRbmService = require('../services/viRbmService');

// Helper function to get complete template details
async function getTemplateDetails(templateId) {
    try {
        // Get template
        const [templates] = await query('SELECT * FROM rcs_templates WHERE id = ?', [templateId]);

        if (templates.length === 0) {
            return null;
        }

        const template = templates[0];

        // Get buttons
        const [buttons] = await query('SELECT * FROM rcs_template_buttons WHERE template_id = ? ORDER BY position', [templateId]);

        // Get variables
        const [variables] = await query('SELECT * FROM rcs_template_variables WHERE template_id = ?', [templateId]);

        // Get analytics
        const [analytics] = await query('SELECT * FROM rcs_template_analytics WHERE template_id = ?', [templateId]);

        return {
            id: template.id,
            name: template.name,
            language: template.language,
            category: template.category,
            status: template.status,
            templateType: template.template_type || 'text_message', // Handle legacy records
            metadata: typeof template.metadata === 'string' ? JSON.parse(template.metadata || '{}') : (template.metadata || {}),
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
                sentCount: analytics[0].total_sent,
                readCount: analytics[0].total_read,
                clickedCount: analytics[0].total_clicked,
                deliveredRate: analytics[0].total_sent > 0 ? Math.round((analytics[0].total_read / analytics[0].total_sent) * 100) : 0,
                openedRate: analytics[0].total_sent > 0 ? Math.round((analytics[0].total_read / analytics[0].total_sent) * 100) : 0,
                clickedRate: analytics[0].total_read > 0 ? Math.round((analytics[0].total_clicked / analytics[0].total_read) * 100) : 0
            } : {
                sentCount: 0,
                readCount: 0,
                clickedCount: 0,
                deliveredRate: 0,
                openedRate: 0,
                clickedRate: 0
            }
        };
    } catch (error) {
        console.error('Error getting template details:', error);
        return null;
    }
}

// GET all RCS templates
router.get('/templates', async (req, res) => {
    try {
        const [results] = await query('SELECT id FROM rcs_templates ORDER BY created_at DESC');

        // Fetch full details for each template
        const templatesWithDetails = await Promise.all(
            results.map(async (row) => await getTemplateDetails(row.id))
        );

        res.json(templatesWithDetails.filter(t => t !== null));
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
            template_type, // "text_message", "rich_card", "carousel"
            header_type,
            header_content,
            body, // For text_message
            footer,
            status = 'pending_approval',
            buttons = [],
            variables = [],
            metadata = {}, // JSON object for Rich Card/Carousel details
            created_by
        } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Template name is required' });
        }

        const templateId = uuidv4();
        const metaStr = JSON.stringify(metadata || {});

        // Insert template
        await query(
            `INSERT INTO rcs_templates 
            (id, name, language, category, template_type, status, header_type, header_content, body, footer, metadata, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                templateId,
                name,
                language || 'en',
                category || 'Marketing',
                template_type || 'text_message',
                status,
                header_type || 'none',
                header_content || null,
                body || '', // Can be empty for carousel/rich card if description is used instead
                footer || null,
                metaStr,
                created_by || 'system'
            ]
        );

        // Insert buttons (if any)
        if (buttons && buttons.length > 0) {
            for (const button of buttons) {
                await query(
                    `INSERT INTO rcs_template_buttons 
                    (template_id, type, action_type, display_text, uri, position)
                    VALUES (?, ?, ?, ?, ?, ?)`,
                    [
                        templateId,
                        button.type || 'action',
                        button.actionType || null,
                        button.displayText,
                        button.uri || null,
                        button.position || 0
                    ]
                );
            }
        }

        // Insert variables (if any)
        if (variables && variables.length > 0) {
            for (const variable of variables) {
                await query(
                    `INSERT INTO rcs_template_variables 
                    (template_id, name, sample_value)
                    VALUES (?, ?, ?)`,
                    [templateId, variable.name, variable.sampleValue || '']
                );
            }
        }

        // Initialize analytics
        await query(
            `INSERT INTO rcs_template_analytics (template_id, total_sent, total_read, total_clicked) VALUES (?, 0, 0, 0)`,
            [templateId]
        );

        // --- Vi RBM Integration ---
        // Try to submit to Vi RBM Platform
        try {
            const richTemplateData = {
                name: name,
                type: template_type,
                botId: process.env.VI_RBM_BOT_ID,
                // Add other mappings based on template_type
                // text_message
                ...(template_type === 'text_message' && {
                    textMessageContent: body,
                    suggestions: buttons.map(b => ({
                        suggestionType: b.type, // 'reply', 'url_action', 'dialer_action'
                        displayText: b.displayText,
                        postback: b.displayText, // or generate a unique postback
                        ...(b.type === 'url_action' && { url: b.uri }),
                        ...(b.type === 'dialer_action' && { phoneNumber: b.uri })
                    }))
                }),
                // rich_card
                ...(template_type === 'rich_card' && {
                    orientation: metadata.orientation || 'VERTICAL',
                    height: metadata.height || 'SHORT_HEIGHT',
                    standAlone: {
                        cardTitle: metadata.cardTitle || 'Title',
                        cardDescription: metadata.cardDescription || body || 'Description',
                        mediaUrl: metadata.mediaUrl, // Assuming URL for now, file upload separate flow
                        thumbnailUrl: metadata.thumbnailUrl,
                        suggestions: buttons.map(b => ({
                            suggestionType: b.type,
                            displayText: b.displayText,
                            postback: b.displayText,
                            ...(b.type === 'url_action' && { url: b.uri }),
                            ...(b.type === 'dialer_action' && { phoneNumber: b.uri })
                        }))
                    }
                }),
                // carousel
                ...(template_type === 'carousel' && {
                    height: metadata.height || 'SHORT_HEIGHT',
                    width: metadata.width || 'MEDIUM_WIDTH',
                    carouselList: metadata.carouselList || [] // complex mapping needed for carousel items
                })
            };

            // Only attempt submit if it looks like a valid Vi RBM template
            // For now, we just log the attempt, we need to handle the response
            console.log('📤 Submitting template to Vi RBM...', name);
            const rbmResponse = await viRbmService.submitTemplate(richTemplateData);
            console.log('✅ Vi RBM Response:', rbmResponse);

            // Optionally update status based on RBM response
            // await query("UPDATE rcs_templates SET status = 'submitted' WHERE id = ?", [templateId]);

        } catch (rbmError) {
            console.error('⚠️ Failed to submit to Vi RBM (saved locally only):', rbmError.message || rbmError);
            // We don't fail the request, just log it. The user can retry syncing later.
        }

        const createdTemplate = await getTemplateDetails(templateId);
        res.status(201).json(createdTemplate);
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
            template_type,
            header_type,
            header_content,
            body,
            footer,
            status,
            buttons = [],
            variables = [],
            metadata = {}
        } = req.body;

        const metaStr = JSON.stringify(metadata || {});

        await query(
            `UPDATE rcs_templates 
            SET name = ?, language = ?, category = ?, template_type = ?, status = ?,
                header_type = ?, header_content = ?, body = ?, footer = ?, metadata = ?,
                updated_at = NOW()
            WHERE id = ?`,
            [
                name,
                language,
                category,
                template_type,
                status,
                header_type || 'none',
                header_content || null,
                body,
                footer || null,
                metaStr,
                req.params.id
            ]
        );

        // Update buttons (Simple approach: delete and re-insert)
        await query('DELETE FROM rcs_template_buttons WHERE template_id = ?', [req.params.id]);
        if (buttons && buttons.length > 0) {
            for (const button of buttons) {
                await query(
                    `INSERT INTO rcs_template_buttons 
                    (template_id, type, action_type, display_text, uri, position)
                    VALUES (?, ?, ?, ?, ?, ?)`,
                    [
                        req.params.id,
                        button.type || 'action',
                        button.actionType || null,
                        button.displayText,
                        button.uri || null,
                        button.position || 0
                    ]
                );
            }
        }

        // Update variables
        await query('DELETE FROM rcs_template_variables WHERE template_id = ?', [req.params.id]);
        if (variables && variables.length > 0) {
            for (const variable of variables) {
                await query(
                    `INSERT INTO rcs_template_variables 
                    (template_id, name, sample_value)
                    VALUES (?, ?, ?)`,
                    [req.params.id, variable.name, variable.sampleValue || '']
                );
            }
        }

        // --- Vi RBM Integration ---
        try {
            const richTemplateData = {
                name: name, // Name cannot be changed usually, but needed for mapping
                type: template_type,
                botId: process.env.VI_RBM_BOT_ID,
                ...(template_type === 'text_message' && {
                    textMessageContent: body,
                    suggestions: buttons.map(b => ({
                        suggestionType: b.type,
                        displayText: b.displayText,
                        postback: b.displayText,
                        ...(b.type === 'url_action' && { url: b.uri }),
                        ...(b.type === 'dialer_action' && { phoneNumber: b.uri })
                    }))
                }),
                ...(template_type === 'rich_card' && {
                    orientation: metadata.orientation || 'VERTICAL',
                    height: metadata.height || 'SHORT_HEIGHT',
                    standAlone: {
                        cardTitle: metadata.cardTitle || 'Title',
                        cardDescription: metadata.cardDescription || body || 'Description',
                        mediaUrl: metadata.mediaUrl,
                        thumbnailUrl: metadata.thumbnailUrl,
                        suggestions: buttons.map(b => ({
                            suggestionType: b.type,
                            displayText: b.displayText,
                            postback: b.displayText,
                            ...(b.type === 'url_action' && { url: b.uri }),
                            ...(b.type === 'dialer_action' && { phoneNumber: b.uri })
                        }))
                    }
                }),
                ...(template_type === 'carousel' && {
                    height: metadata.height || 'SHORT_HEIGHT',
                    width: metadata.width || 'MEDIUM_WIDTH',
                    carouselList: metadata.carouselList || []
                })
            };

            console.log('📤 Updating template on Vi RBM...', name);
            await viRbmService.updateTemplate(name, richTemplateData);
            console.log('✅ Vi RBM Update Success');
        } catch (rbmError) {
            console.error('⚠️ Failed to update on Vi RBM:', rbmError.message || rbmError);
        }

        const updatedTemplate = await getTemplateDetails(req.params.id);
        res.json(updatedTemplate);
    } catch (error) {
        console.error('Error updating template:', error);
        res.status(500).json({ error: 'Failed to update template' });
    }
});

// DELETE RCS template
router.delete('/templates/:id', async (req, res) => {
    try {
        // Fetch template name first for RBM deletion
        const [templates] = await query('SELECT name FROM rcs_templates WHERE id = ?', [req.params.id]);

        if (templates.length > 0) {
            const templateName = templates[0].name;
            // --- Vi RBM Integration ---
            try {
                console.log('🗑️ Deleting template from Vi RBM...', templateName);
                await viRbmService.deleteTemplate(templateName);
                console.log('✅ Vi RBM Delete Success');
            } catch (rbmError) {
                console.error('⚠️ Failed to delete from Vi RBM:', rbmError.message || rbmError);
            }
        }

        // Cascade delete would be ideal but doing it manually to be safe
        await query('DELETE FROM rcs_template_buttons WHERE template_id = ?', [req.params.id]);
        await query('DELETE FROM rcs_template_variables WHERE template_id = ?', [req.params.id]);
        await query('DELETE FROM rcs_template_analytics WHERE template_id = ?', [req.params.id]);
        await query('DELETE FROM rcs_template_approvals WHERE template_id = ?', [req.params.id]);
        await query('DELETE FROM rcs_templates WHERE id = ?', [req.params.id]);

        res.json({ success: true, message: 'Template deleted' });
    } catch (error) {
        console.error('Error deleting template:', error);
        res.status(500).json({ error: 'Failed to delete template' });
    }
});

// APPROVE template
router.put('/templates/:id/approve', async (req, res) => {
    try {
        await query(
            "UPDATE rcs_templates SET status = 'approved', updated_at = NOW() WHERE id = ?",
            [req.params.id]
        );

        // Log approval
        await query(
            `INSERT INTO rcs_template_approvals 
            (template_id, status, approved_by, approved_at)
            VALUES (?, 'approved', ?, NOW())`,
            [req.params.id, req.body.approved_by || 'system']
        );

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

        await query(
            "UPDATE rcs_templates SET status = 'rejected', rejection_reason = ?, updated_at = NOW() WHERE id = ?",
            [rejection_reason || '', req.params.id]
        );

        // Log rejection
        await query(
            `INSERT INTO rcs_template_approvals 
            (template_id, status, rejection_reason, rejected_by, rejected_at)
            VALUES (?, 'rejected', ?, ?, NOW())`,
            [req.params.id, rejection_reason || '', rejected_by || 'system']
        );

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
        const [results] = await query(
            'SELECT id FROM rcs_templates WHERE status = ? ORDER BY created_at DESC',
            [req.params.status]
        );
        const templates = await Promise.all(
            results.map(t => getTemplateDetails(t.id))
        );
        res.json(templates.filter(t => t !== null));
    } catch (error) {
        console.error('Error fetching templates by status:', error);
        res.status(500).json({ error: 'Failed to fetch templates' });
    }
});

module.exports = router;
