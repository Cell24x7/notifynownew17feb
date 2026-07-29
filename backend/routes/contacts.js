const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const jwt = require('jsonwebtoken');

const authenticate = require('../middleware/authMiddleware');

// GET /api/contacts - List all contacts
router.get('/', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const { search, category, channel, status, view, list_id, label } = req.query;

        // Base query
        let sql = 'SELECT c.* FROM contacts c ';
        if (list_id) {
            sql += 'JOIN contact_list_members m ON c.id = m.contact_id ';
        }
        sql += 'WHERE c.user_id = ?';
        let params = [userId];

        if (list_id) {
            sql += ' AND m.list_id = ?';
            params.push(list_id);
        }

        // Filters
        if (search) {
            sql += ' AND (c.name LIKE ? OR c.phone LIKE ? OR c.email LIKE ?)';
            const searchPattern = `%${search}%`;
            params.push(searchPattern, searchPattern, searchPattern);
        }

        if (category) {
            sql += ' AND c.category = ?';
            params.push(category);
        }

        if (channel) {
            sql += ' AND c.channel = ?';
            params.push(channel);
        }

        if (status) {
            sql += ' AND c.status = ?';
            params.push(status);
        }

        if (label) {
            sql += " AND c.labels LIKE ?";
            params.push(`%${label}%`);
        }

        // Views
        if (view === 'starred') {
            sql += ' AND c.starred = TRUE';
        } else if (view === 'blacklisted') {
            sql += " AND c.status = 'blocked'";
        }

        // Ordering
        sql += ' ORDER BY c.created_at DESC';

        const [contacts] = await query(sql, params);
        res.json({ success: true, contacts });
    } catch (error) {
        console.error('Get contacts error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch contacts' });
    }
});

// POST /api/contacts - Add contact
router.post('/', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, phone, email, category, channel, labels, starred, status, list_id } = req.body;

        if (!name || !phone) {
            return res.status(400).json({ success: false, message: 'Name and Phone are required' });
        }

        const contactId = `CONT${Date.now()}`;

        // Check for duplicate phone
        const [existing] = await query('SELECT id FROM contacts WHERE phone = ? AND user_id = ?', [phone, userId]);
        if (existing.length > 0) {
            return res.status(409).json({ success: false, message: 'Contact with this phone already exists' });
        }

        await query(
            `INSERT INTO contacts 
            (id, user_id, name, phone, email, category, channel, labels, starred, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                contactId,
                userId,
                name,
                phone,
                email || null,
                category || 'lead',
                channel || 'whatsapp',
                labels || '',
                starred || false,
                status || 'active'
            ]
        );

        if (list_id) {
            await query(
                'INSERT IGNORE INTO contact_list_members (list_id, contact_id) VALUES (?, ?)',
                [list_id, contactId]
            );
        }

        res.status(201).json({
            success: true,
            message: 'Contact created successfully',
            contact: { id: contactId, name, phone, email, category, channel, labels, starred, status, list_id }
        });
    } catch (error) {
        console.error('Create contact error:', error);
        res.status(500).json({ success: false, message: 'Failed to create contact' });
    }
});

// PUT /api/contacts/:id - Update contact
router.put('/:id', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const updates = req.body; // { name, phone, sent_via, ... }

        // Verify ownership
        const [existing] = await query('SELECT * FROM contacts WHERE id = ? AND user_id = ?', [id, userId]);
        if (existing.length === 0) return res.status(404).json({ success: false, message: 'Contact not found' });

        // Allowed fields to update
        const allowedFields = ['name', 'phone', 'email', 'category', 'channel', 'labels', 'starred', 'status'];
        const fieldsToUpdate = [];
        const params = [];

        for (const field of allowedFields) {
            if (updates[field] !== undefined) {
                fieldsToUpdate.push(`${field} = ?`);
                params.push(updates[field]);
            }
        }

        if (fieldsToUpdate.length === 0) {
            return res.status(400).json({ success: false, message: 'No fields to update' });
        }

        const sql = `UPDATE contacts SET ${fieldsToUpdate.join(', ')} WHERE id = ? AND user_id = ?`;
        params.push(id, userId);

        await query(sql, params);

        res.json({ success: true, message: 'Contact updated successfully' });
    } catch (error) {
        console.error('Update contact error:', error);
        res.status(500).json({ success: false, message: 'Failed to update contact', error: error.message });
    }
});

// DELETE /api/contacts/:id - Delete contact
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const [result] = await query('DELETE FROM contacts WHERE id = ? AND user_id = ?', [id, userId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Contact not found' });
        }

        res.json({ success: true, message: 'Contact deleted successfully' });
    } catch (error) {
        console.error('Delete contact error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete contact' });
    }
});

// POST /api/contacts/bulk - Bulk Import
router.post('/bulk', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const { contacts, list_id } = req.body; // Expects array of { name, phone, email, ... }

        if (!Array.isArray(contacts) || contacts.length === 0) {
            return res.status(400).json({ success: false, message: 'No contacts provided' });
        }

        console.log(`Processing bulk import for ${contacts.length} contacts...`);

        // Prepare all values first
        const allValues = [];
        const contactIds = [];

        for (const contact of contacts) {
            const contactId = `CONT${Date.now()}${Math.floor(Math.random() * 1000)}`;
            contactIds.push(contactId);

            // Normalize ENUMs
            let category = (contact.category || 'lead').toLowerCase();
            if (!['guest', 'lead', 'customer', 'vip'].includes(category)) category = 'lead';

            let channel = (contact.channel || 'whatsapp').toLowerCase();
            if (!['whatsapp', 'email', 'sms', 'rcs', 'instagram', 'web'].includes(channel)) channel = 'whatsapp';

            let status = (contact.status || 'active').toLowerCase();
            if (!['active', 'inactive', 'blocked', 'pending'].includes(status)) status = 'active';

            allValues.push([
                contactId,
                userId,
                contact.name || 'Unknown',
                contact.phone || '',
                contact.email || null,
                category,
                channel,
                contact.labels || '',
                contact.starred || false,
                status
            ]);
        }

        // Batch Process insertion
        const BATCH_SIZE = 1000;
        let insertedCount = 0;

        for (let i = 0; i < allValues.length; i += BATCH_SIZE) {
            const batch = allValues.slice(i, i + BATCH_SIZE);
            if (batch.length > 0) {
                await query(
                    `INSERT IGNORE INTO contacts 
                    (id, user_id, name, phone, email, category, channel, labels, starred, status) 
                    VALUES ?`,
                    [batch]
                );
                insertedCount += batch.length;
                console.log(`Submitted batch: ${insertedCount}/${allValues.length}`);
            }
        }

        // Add to list if list_id is provided
        if (list_id) {
            const phones = contacts.map(c => c.phone).filter(Boolean);
            for (let i = 0; i < phones.length; i += BATCH_SIZE) {
                const phoneBatch = phones.slice(i, i + BATCH_SIZE);
                if (phoneBatch.length > 0) {
                    const [existingContacts] = await query(
                        'SELECT id FROM contacts WHERE user_id = ? AND phone IN (?)',
                        [userId, phoneBatch]
                    );
                    if (existingContacts.length > 0) {
                        const memberValues = existingContacts.map(c => [list_id, c.id]);
                        await query(
                            'INSERT IGNORE INTO contact_list_members (list_id, contact_id) VALUES ?',
                            [memberValues]
                        );
                    }
                }
            }
        }

        res.status(201).json({ success: true, message: `Successfully imported ${insertedCount} contacts` });
    } catch (error) {
        console.error('Bulk import error:', error);
        res.status(500).json({ success: false, message: 'Failed to import contacts' });
    }
});

module.exports = router;
