const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const jwt = require('jsonwebtoken');

// Middleware to authenticate token
const authenticateToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });

    jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey123', (err, decoded) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.user = decoded;
        next();
    });
};

// GET /api/contacts - List all contacts
router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { search, category, channel, status, view } = req.query;

        // Base query
        let sql = 'SELECT * FROM contacts WHERE user_id = ?';
        let params = [userId];

        // Filters
        if (search) {
            sql += ' AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)';
            const searchPattern = `%${search}%`;
            params.push(searchPattern, searchPattern, searchPattern);
        }

        if (category) {
            sql += ' AND category = ?';
            params.push(category);
        }

        if (channel) {
            sql += ' AND channel = ?';
            params.push(channel);
        }

        if (status) {
            sql += ' AND status = ?';
            params.push(status);
        }

        // Views
        if (view === 'starred') {
            sql += ' AND starred = TRUE';
        } else if (view === 'blacklisted') {
            sql += " AND status = 'blocked'";
        } else if (view === 'all') {
            // Optional: If you want 'All Contacts' to NOT show blocked ones by default:
            // sql += " AND status != 'blocked'";
            // But usually 'All' means all. Sticking to standard behavior unless requested otherwise.
            // User just said "jab blacklisted par click karu... vahi dikhe" (when I click blacklisted... only show those).
        }

        // Ordering
        sql += ' ORDER BY created_at DESC';

        const [contacts] = await query(sql, params);
        res.json({ success: true, contacts });
    } catch (error) {
        console.error('Get contacts error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch contacts' });
    }
});

// POST /api/contacts - Add contact
router.post('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, phone, email, category, channel, labels, starred, status } = req.body;

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

        res.status(201).json({
            success: true,
            message: 'Contact created successfully',
            contact: { id: contactId, name, phone, email, category, channel, labels, starred, status }
        });
    } catch (error) {
        console.error('Create contact error:', error);
        res.status(500).json({ success: false, message: 'Failed to create contact' });
    }
});

// PUT /api/contacts/:id - Update contact
router.put('/:id', authenticateToken, async (req, res) => {
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
router.delete('/:id', authenticateToken, async (req, res) => {
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
router.post('/bulk', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { contacts } = req.body; // Expects array of { name, phone, email, ... }

        if (!Array.isArray(contacts) || contacts.length === 0) {
            return res.status(400).json({ success: false, message: 'No contacts provided' });
        }

        const values = [];
        const contactIds = [];

        for (const contact of contacts) {
            const contactId = `CONT${Date.now()}${Math.floor(Math.random() * 1000)}`;
            contactIds.push(contactId);

            // Normalize ENUMs
            let category = (contact.category || 'lead').toLowerCase();
            if (!['guest', 'lead', 'customer', 'vip'].includes(category)) category = 'lead';

            let channel = (contact.channel || 'whatsapp').toLowerCase();
            if (!['whatsapp', 'email', 'sms', 'instagram', 'web'].includes(channel)) channel = 'whatsapp';

            let status = (contact.status || 'active').toLowerCase();
            if (!['active', 'inactive', 'blocked', 'pending'].includes(status)) status = 'active';

            values.push([
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

        if (values.length > 0) {
            await query(
                `INSERT INTO contacts 
                (id, user_id, name, phone, email, category, channel, labels, starred, status) 
                VALUES ?`,
                [values]
            );
        }

        res.status(201).json({ success: true, message: `Successfully imported ${values.length} contacts` });
    } catch (error) {
        console.error('Bulk import error:', error);
        res.status(500).json({ success: false, message: 'Failed to import contacts' });
    }
});

module.exports = router;
