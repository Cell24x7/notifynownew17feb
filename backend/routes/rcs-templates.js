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
                body || '',
                footer || null,
                metaStr,
                created_by || 'system'
            ]
        );

        // Insert buttons (suggestions)
        if (buttons && buttons.length > 0) {
            for (const button of buttons) {
                await query(
                    `INSERT INTO rcs_template_buttons 
                    (template_id, type, action_type, display_text, uri, position, payload)
                    VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [
                        templateId,
                        button.type || 'reply', // 'reply', 'url_action', 'dialer_action', 'calendar_event', 'view_location', 'share_location'
                        button.actionType || null,
                        button.displayText,
                        button.uri || null, // Stores URL or Phone Number or Lat/Long
                        button.position || 0,
                        JSON.stringify(button.payload || {}) // Store extra data like startTime, endTime, title, description for calendar
                    ]
                );
            }
        }

        // Insert variables
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
        try {
            // Helper to map buttons to RBM suggestions
            const mapSuggestions = (btns) => {
                return btns.map(b => {
                    const base = {
                        displayText: b.displayText,
                        postback: b.postback || b.displayText.toLowerCase().replace(/\s+/g, '_')
                    };

                    switch (b.type) {
                        case 'reply':
                            return { ...base, suggestionType: 'reply' };
                        case 'url_action':
                            return { ...base, suggestionType: 'url_action', url: b.uri };
                        case 'dialer_action':
                            return { ...base, suggestionType: 'dialer_action', phoneNumber: b.uri };
                        case 'calendar_event':
                            return {
                                ...base,
                                suggestionType: 'calendar_event',
                                startTime: b.payload?.startTime,
                                endTime: b.payload?.endTime,
                                title: b.payload?.title,
                                description: b.payload?.description,
                                timeZone: b.payload?.timeZone
                            };
                        case 'view_location_latlong': // Custom internal type mapping
                            return {
                                ...base,
                                suggestionType: 'view_location_latlong',
                                latitude: b.payload?.latitude,
                                longitude: b.payload?.longitude,
                                label: b.payload?.label
                            };
                        case 'view_location_query':
                            return {
                                ...base,
                                suggestionType: 'view_location_query',
                                query: b.payload?.query
                            };
                        case 'share_location':
                            return { ...base, suggestionType: 'share_location' };
                        default:
                            return { ...base, suggestionType: 'reply' };
                    }
                });
            };

            const richTemplateData = {
                name: name,
                type: template_type,
                botId: process.env.VI_RBM_BOT_ID,
            };

            if (template_type === 'text_message') {
                richTemplateData.textMessageContent = body;
                richTemplateData.suggestions = mapSuggestions(buttons);
            } else if (template_type === 'rich_card') {
                richTemplateData.orientation = metadata.orientation || 'VERTICAL';
                richTemplateData.height = metadata.height || 'SHORT_HEIGHT';

                // Alignment only for HORIZONTAL
                if (richTemplateData.orientation === 'HORIZONTAL') {
                    richTemplateData.alignment = metadata.alignment || 'LEFT';
                }

                richTemplateData.standAlone = {
                    cardTitle: metadata.cardTitle || 'Title',
                    cardDescription: metadata.cardDescription || body || 'Description',
                    suggestions: mapSuggestions(buttons)
                };

                // Media handling
                if (metadata.mediaUrl) {
                    richTemplateData.standAlone.mediaUrl = metadata.mediaUrl;
                }
                if (metadata.thumbnailUrl) {
                    richTemplateData.standAlone.thumbnailUrl = metadata.thumbnailUrl;
                }

                // If using file upload (multipart), file names need to arguably match
                // We're expecting mediaUrl for now as per "Upload Multimedia from Url" section
            } else if (template_type === 'carousel') {
                richTemplateData.height = metadata.height || 'SHORT_HEIGHT';
                richTemplateData.width = metadata.width || 'MEDIUM_WIDTH';

                // Process carousel items
                if (metadata.carouselList && Array.isArray(metadata.carouselList)) {
                    richTemplateData.carouselList = metadata.carouselList.map(card => ({
                        cardTitle: card.title,
                        cardDescription: card.description,
                        mediaUrl: card.mediaUrl,
                        thumbnailUrl: card.thumbnailUrl,
                        suggestions: mapSuggestions(card.buttons || [])
                    }));
                }
            }

            console.log('📤 Submitting template to Vi RBM...', name);
            // We pass empty array for mediaFiles for now, assuming URL based media
            const rbmResponse = await viRbmService.submitTemplate(richTemplateData);
            console.log('✅ Vi RBM Response:', rbmResponse);

            // Update status if successful (usually 202 Accepted -> pending)
            // But we keep it 'pending_approval' locally until callback/sync check
        } catch (rbmError) {
            console.error('⚠️ Failed to submit to Vi RBM (saved locally only):', rbmError.message || rbmError);
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

        // Update buttons
        await query('DELETE FROM rcs_template_buttons WHERE template_id = ?', [req.params.id]);
        if (buttons && buttons.length > 0) {
            for (const button of buttons) {
                await query(
                    `INSERT INTO rcs_template_buttons 
                    (template_id, type, action_type, display_text, uri, position, payload)
                    VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [
                        req.params.id,
                        button.type || 'reply',
                        button.actionType || null,
                        button.displayText,
                        button.uri || null,
                        button.position || 0,
                        JSON.stringify(button.payload || {})
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
            // Helper to map buttons to RBM suggestions (Duplicates logic from Create - refactor later)
            const mapSuggestions = (btns) => {
                return btns.map(b => {
                    const base = {
                        displayText: b.displayText,
                        postback: b.postback || b.displayText.toLowerCase().replace(/\s+/g, '_')
                    };

                    switch (b.type) {
                        case 'reply': return { ...base, suggestionType: 'reply' };
                        case 'url_action': return { ...base, suggestionType: 'url_action', url: b.uri };
                        case 'dialer_action': return { ...base, suggestionType: 'dialer_action', phoneNumber: b.uri };
                        case 'calendar_event':
                            return {
                                ...base,
                                suggestionType: 'calendar_event',
                                startTime: b.payload?.startTime,
                                endTime: b.payload?.endTime,
                                title: b.payload?.title,
                                description: b.payload?.description,
                                timeZone: b.payload?.timeZone
                            };
                        case 'view_location_latlong':
                            return {
                                ...base,
                                suggestionType: 'view_location_latlong',
                                latitude: b.payload?.latitude,
                                longitude: b.payload?.longitude,
                                label: b.payload?.label
                            };
                        case 'view_location_query':
                            return { ...base, suggestionType: 'view_location_query', query: b.payload?.query };
                        case 'share_location': return { ...base, suggestionType: 'share_location' };
                        default: return { ...base, suggestionType: 'reply' };
                    }
                });
            };

            const richTemplateData = {
                name: name,
                type: template_type,
                botId: process.env.VI_RBM_BOT_ID,
            };

            if (template_type === 'text_message') {
                richTemplateData.textMessageContent = body;
                richTemplateData.suggestions = mapSuggestions(buttons);
            } else if (template_type === 'rich_card') {
                richTemplateData.orientation = metadata.orientation || 'VERTICAL';
                richTemplateData.height = metadata.height || 'SHORT_HEIGHT';
                if (richTemplateData.orientation === 'HORIZONTAL') {
                    richTemplateData.alignment = metadata.alignment || 'LEFT';
                }

                richTemplateData.standAlone = {
                    cardTitle: metadata.cardTitle || 'Title',
                    cardDescription: metadata.cardDescription || body || 'Description',
                    suggestions: mapSuggestions(buttons)
                };

                if (metadata.mediaUrl) richTemplateData.standAlone.mediaUrl = metadata.mediaUrl;
                if (metadata.thumbnailUrl) richTemplateData.standAlone.thumbnailUrl = metadata.thumbnailUrl;

            } else if (template_type === 'carousel') {
                richTemplateData.height = metadata.height || 'SHORT_HEIGHT';
                richTemplateData.width = metadata.width || 'MEDIUM_WIDTH';

                if (metadata.carouselList && Array.isArray(metadata.carouselList)) {
                    richTemplateData.carouselList = metadata.carouselList.map(card => ({
                        cardTitle: card.title,
                        cardDescription: card.description,
                        mediaUrl: card.mediaUrl,
                        thumbnailUrl: card.thumbnailUrl,
                        suggestions: mapSuggestions(card.buttons || [])
                    }));
                }
            }

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

        // Cascade delete
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

// SYNC template status from Vi RBM
router.post('/templates/:id/sync', async (req, res) => {
    try {
        const [templates] = await query('SELECT name, status FROM rcs_templates WHERE id = ?', [req.params.id]);

        if (templates.length === 0) {
            return res.status(404).json({ error: 'Template not found' });
        }

        const template = templates[0];
        console.log('🔄 Syncing status for template:', template.name);

        try {
            // Get status from Vi RBM
            const rbmStatus = await viRbmService.getTemplateStatus(template.name);
            console.log('✅ Vi RBM Status:', rbmStatus);

            // Map RBM status to local status
            // RBM statuses: PENDING, APPROVED, REJECTED
            let localStatus = template.status;
            let rejectionReason = null;

            if (rbmStatus.status === 'APPROVED') {
                localStatus = 'approved';
            } else if (rbmStatus.status === 'REJECTED') {
                localStatus = 'rejected';
                rejectionReason = rbmStatus.reason || 'Rejected by Vi';
            } else if (rbmStatus.status === 'PENDING') {
                localStatus = 'pending_approval';
            }

            // Update local DB if changed
            if (localStatus !== template.status) {
                await query(
                    'UPDATE rcs_templates SET status = ?, rejection_reason = ?, updated_at = NOW() WHERE id = ?',
                    [localStatus, rejectionReason, req.params.id]
                );
            }

            const updatedTemplate = await getTemplateDetails(req.params.id);
            res.json(updatedTemplate);

        } catch (rbmError) {
            console.error('⚠️ Failed to sync with Vi RBM:', rbmError.message || rbmError);
            res.status(502).json({ error: 'Failed to sync with Vi RBM' });
        }

    } catch (error) {
        console.error('Error syncing template:', error);
        res.status(500).json({ error: 'Failed to sync template' });
    }
});

module.exports = router;
