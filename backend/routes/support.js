const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const authenticate = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { sendAdminNotification, sendEmail } = require('../utils/emailService');

const { logSystem } = require('../utils/logger');

// Setup Multer for screenshots
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '..', 'uploads', 'support');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },


    filename: (req, file, cb) => {
        const sanitized = file.originalname.replace(/\s+/g, '_');
        cb(null, `ticket-${Date.now()}-${sanitized}`);
    }
});
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});


/**
 * @route POST /api/support/tickets
 * @desc Create a new support ticket
 */
router.post('/tickets', authenticate, upload.array('attachments'), async (req, res) => {
    const { subject, category, description, priority = 'medium' } = req.body;
    const userId = req.user.id;

    if (!subject || !category || !description) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    try {
        // 1. Insert Ticket
        const [result] = await query(
            'INSERT INTO tickets (user_id, subject, category, description, status, priority) VALUES (?, ?, ?, ?, "open", ?)',
            [userId, subject, category, description, priority]
        );
        const ticketId = result.insertId;

        // 2. Handle Attachments
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                await query(
                    'INSERT INTO ticket_attachments (ticket_id, file_url, file_type, file_name) VALUES (?, ?, ?, ?)',
                    [ticketId, `/api/uploads/support/${file.filename}`, file.mimetype, file.originalname]
                );

            }
            console.log(`📎 Ticket ${ticketId} has ${req.files.length} attachments saved.`);
        }


        // 3. Notify Admins (Email & WhatsApp Integration)
        const [userRows] = await query('SELECT name, email, contact_phone, company FROM users WHERE id = ?', [userId]);
        if (userRows.length > 0) {
            const user = userRows[0];
            
            // Reusing existing admin notification system with a new type
            try {
                await sendAdminNotification({
                    ...user,
                    id: userId,
                    ticket_id: ticketId,
                    subject: subject,
                    category: category,
                    description: description
                }, 'TICKET_RAISED');
            } catch (err) {
                console.error('Failed to send admin ticket notification:', err.message);
            }
        }

        await logSystem('info', 'Support Ticket Created', `User ${userId} raised ticket #${ticketId}: ${subject}`, userId, req.user.name);

        res.json({ success: true, ticketId, message: 'Ticket raised successfully' });
    } catch (error) {
        console.error('❌ Create Ticket Error:', error.message);
        res.status(500).json({ success: false, message: 'Failed to raise ticket' });
    }
});

/**
 * @route GET /api/support/tickets
 * @desc Get user's tickets
 */
router.get('/tickets', authenticate, async (req, res) => {
    try {
        const [rows] = await query(
            `SELECT t.*, u.name as assigned_to_name 
             FROM tickets t 
             LEFT JOIN users u ON t.assigned_to = u.id 
             WHERE t.user_id = ? 
             ORDER BY t.created_at DESC`,
            [req.user.id]
        );
        res.json({ success: true, tickets: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch tickets' });
    }
});

/**
 * @route GET /api/support/tickets/:id
 * @desc Get ticket details and replies
 */
router.get('/tickets/:id', authenticate, async (req, res) => {
    try {
        const ticketId = req.params.id;
        const userId = req.user.id;
        const userRole = (req.user.role || '').toLowerCase();
        const isAdmin = userRole === 'admin' || userRole === 'superadmin' || userRole === 'staff';


        const [tickets] = await query(
            `SELECT t.*, u.name as user_name, u.email as user_email, a.name as assistant_name 
             FROM tickets t 
             JOIN users u ON t.user_id = u.id 
             LEFT JOIN users a ON t.assigned_to = a.id
             WHERE t.id = ?`,
            [ticketId]
        );

        if (!tickets.length) return res.status(404).json({ success: false, message: 'Ticket not found' });
        
        // Check ownership
        if (!isAdmin && tickets[0].user_id !== userId) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        let replies = [];
        try {
            const [replyRows] = await query(
                'SELECT r.*, u.name as sender_name FROM ticket_replies r JOIN users u ON r.user_id = u.id WHERE r.ticket_id = ? ORDER BY r.created_at ASC',
                [ticketId]
            );
            replies = replyRows;
        } catch (e) {
            console.error("Error fetching replies:", e.message);
        }

        const [attachments] = await query(
            'SELECT * FROM ticket_attachments WHERE ticket_id = ?',
            [ticketId]
        );

        res.json({ success: true, ticket: tickets[0], replies, attachments });

    } catch (error) {
        console.error(`❌ Fetch Ticket ${req.params.id} Error:`, error.message);
        res.status(500).json({ success: false, message: 'Failed to fetch ticket details', error: error.message });
    }
});

/**
 * @route POST /api/support/tickets/:id/replies
 * @desc Reply to a ticket
 */
router.post('/tickets/:id/replies', authenticate, async (req, res) => {
    const { message } = req.body;
    const ticketId = req.params.id;
    const userId = req.user.id;
    const userRole = (req.user.role || '').toLowerCase();
    const isAdmin = ['admin', 'superadmin', 'staff'].includes(userRole);


    if (!message) return res.status(400).json({ success: false, message: 'Message required' });

    try {
        const [result] = await query(
            'INSERT INTO ticket_replies (ticket_id, user_id, message, is_admin_reply) VALUES (?, ?, ?, ?)',
            [ticketId, userId, message, isAdmin ? 1 : 0]
        );

        // Update ticket updated_at
        await query('UPDATE tickets SET updated_at = NOW() WHERE id = ?', [ticketId]);

        res.json({ success: true, replyId: result.insertId });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to send reply' });
    }
});

/**
 * @route GET /api/support/admin/tickets
 * @desc Get all tickets (Admin/Staff only)
 */
router.get('/admin/tickets', authenticate, async (req, res) => {
    const userRole = (req.user.role || '').toLowerCase();
    if (!['admin', 'superadmin', 'staff'].includes(userRole)) {
        return res.status(403).json({ success: false, message: 'Admin access required' });
    }


    try {
        const [rows] = await query(
            `SELECT t.*, u.name as user_name, u.company, a.name as assigned_to_name 
             FROM tickets t 
             JOIN users u ON t.user_id = u.id 
             LEFT JOIN users a ON t.assigned_to = a.id
             ORDER BY t.created_at DESC`
        );
        res.json({ success: true, tickets: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch tickets' });
    }
});

/**
 * @route PATCH /api/support/admin/tickets/:id
 * @desc Update ticket status or assignment
 */
router.patch('/admin/tickets/:id', authenticate, async (req, res) => {
    const userRole = (req.user.role || '').toLowerCase();
    if (!['admin', 'superadmin', 'staff'].includes(userRole)) {
        return res.status(403).json({ success: false, message: 'Admin access required' });
    }


    const { status, priority, assigned_to } = req.body;
    const ticketId = req.params.id;

    try {
        const updates = [];
        const params = [];

        if (status) { updates.push('status = ?'); params.push(status); }
        if (priority) { updates.push('priority = ?'); params.push(priority); }
        if (assigned_to !== undefined) { updates.push('assigned_to = ?'); params.push(assigned_to); }
        if (req.body.subject) { updates.push('subject = ?'); params.push(req.body.subject); }
        if (req.body.description) { updates.push('description = ?'); params.push(req.body.description); }

        if (updates.length > 0) {
            params.push(ticketId);
            await query(`UPDATE tickets SET ${updates.join(', ')} WHERE id = ?`, params);

            // Special Notification if Resolved/Closed
            if (status === 'resolved' || status === 'closed') {
                const [ticketData] = await query(
                    'SELECT t.subject, u.email, u.name FROM tickets t JOIN users u ON t.user_id = u.id WHERE t.id = ?',
                    [ticketId]
                );
                if (ticketData.length > 0) {
                    const { subject, email, name } = ticketData[0];
                    await sendEmail(
                        email, 
                        `Ticket #${ticketId} Resolved - NotifyNow`, 
                        `Hello ${name},\n\nYour support ticket "#${ticketId}: ${subject}" has been marked as ${status.toUpperCase()}.\n\nIf you have further questions, please reply to the ticket in your dashboard.\n\nTeam NotifyNow`,
                        null,
                        'ticket_resolved'
                    );
                }
            }
        }

        res.json({ success: true, message: 'Ticket updated' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to update ticket' });
    }
});

/**
 * @route DELETE /api/support/admin/tickets/:id
 * @desc Delete a ticket (Admin only)
 */
router.delete('/admin/tickets/:id', authenticate, async (req, res) => {
    const userRole = (req.user.role || '').toLowerCase();
    if (!['admin', 'superadmin'].includes(userRole)) {
        return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    try {
        const ticketId = req.params.id;
        // Delete attachments, then replies, then ticket
        await query('DELETE FROM ticket_attachments WHERE ticket_id = ?', [ticketId]);
        await query('DELETE FROM ticket_replies WHERE ticket_id = ?', [ticketId]);
        await query('DELETE FROM tickets WHERE id = ?', [ticketId]);

        res.json({ success: true, message: 'Ticket deleted successfully' });
    } catch (error) {
        console.error('DELETE Error:', error.message);
        res.status(500).json({ success: false, message: 'Failed to delete ticket' });
    }
});

module.exports = router;
