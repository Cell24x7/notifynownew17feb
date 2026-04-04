const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const authenticate = require('../middleware/authMiddleware');
const axios = require('axios');

// Middleware to ensure user is admin or authorized reseller
const requireAdmin = (req, res, next) => {
    const role = req.user.role;
    let permissions = req.user.permissions || [];
    if (typeof permissions === 'string') {
        try { permissions = JSON.parse(permissions); } catch (e) { permissions = []; }
    }
    if (!Array.isArray(permissions)) permissions = [];

    if (role === 'admin' || role === 'superadmin') {
        return next();
    }

    if (role === 'reseller') {
        const hasViewPerm = permissions.some(p => p.feature === 'SMS Gateways - View' && (p.admin === true || p.admin === 1));
        const hasEditPerm = permissions.some(p => p.feature === 'SMS Gateways - Edit' && (p.admin === true || p.admin === 1));
        
        if (hasViewPerm || hasEditPerm) {
            return next();
        }
    }

    return res.status(403).json({ success: false, message: 'Admin access required' });
};

// ============================================================
// IMPORTANT: Put specific routes BEFORE parameterized routes
// ============================================================

/**
 * POST /api/sms-gateways/assign
 * Assign gateway to user
 */
router.post('/assign', authenticate, requireAdmin, async (req, res) => {
    try {
        const { user_id, gateway_id } = req.body;
        if (!user_id) return res.status(400).json({ success: false, message: 'user_id is required' });

        await query('UPDATE users SET sms_gateway_id = ? WHERE id = ?', [gateway_id || null, user_id]);
        res.json({ success: true, message: 'Gateway assigned successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * GET /api/sms-gateways/assignments/list
 * Get all users with their gateway assignments
 */
router.get('/assignments/list', authenticate, requireAdmin, async (req, res) => {
    try {
        const [users] = await query(`
            SELECT u.id, u.name, u.email, u.sms_gateway_id, sg.name as gateway_name
            FROM users u
            LEFT JOIN sms_gateways sg ON u.sms_gateway_id = sg.id
            WHERE u.role IN ('client', 'user')
            ORDER BY u.name
        `);
        res.json({ success: true, data: users });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * POST /api/sms-gateways/ensure-table
 * Auto-create table if it doesn't exist (called on first load)
 */
router.post('/ensure-table', authenticate, requireAdmin, async (req, res) => {
    try {
        await query(`
            CREATE TABLE IF NOT EXISTS sms_gateways (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                primary_url TEXT NOT NULL,
                secondary_url TEXT,
                status ENUM('active','inactive') DEFAULT 'active',
                routing ENUM('national','international','both') DEFAULT 'national',
                priority ENUM('non-otp','otp','both') DEFAULT 'both',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        res.json({ success: true, message: 'Table ensured' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================
// Standard CRUD routes (parameterized /:id routes LAST)
// ============================================================

/**
 * GET /api/sms-gateways
 * List all SMS gateways
 */
router.get('/', authenticate, requireAdmin, async (req, res) => {
    try {
        // Auto-create table if missing
        await query(`
            CREATE TABLE IF NOT EXISTS sms_gateways (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                primary_url TEXT NOT NULL,
                secondary_url TEXT,
                status ENUM('active','inactive') DEFAULT 'active',
                routing ENUM('national','international','both') DEFAULT 'national',
                priority ENUM('non-otp','otp','both') DEFAULT 'both',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        const [gateways] = await query('SELECT * FROM sms_gateways ORDER BY name ASC');
        res.json({ success: true, data: gateways });
    } catch (error) {
        console.error('Error fetching SMS gateways:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * POST /api/sms-gateways
 * Create new gateway
 */
router.post('/', authenticate, requireAdmin, async (req, res) => {
    try {
        const { name, sender_id, primary_url, secondary_url, status, routing, priority } = req.body;

        if (!name || !primary_url) {
            return res.status(400).json({ success: false, message: 'Gateway name and primary URL are required' });
        }

        const [result] = await query(
            'INSERT INTO sms_gateways (name, sender_id, primary_url, secondary_url, status, routing, priority) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [name, sender_id || 'NOTIFY', primary_url, secondary_url || null, status || 'active', routing || 'national', priority || 'both']
        );

        res.json({ success: true, message: 'Gateway created successfully', data: { id: result.insertId } });
    } catch (error) {
        console.error('Error creating SMS gateway:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * GET /api/sms-gateways/:id
 * Get single gateway
 */
router.get('/:id', authenticate, requireAdmin, async (req, res) => {
    try {
        const [gateways] = await query('SELECT * FROM sms_gateways WHERE id = ?', [req.params.id]);
        if (gateways.length === 0) return res.status(404).json({ success: false, message: 'Gateway not found' });
        res.json({ success: true, data: gateways[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * PUT /api/sms-gateways/:id
 * Update gateway
 */
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
    try {
        const { name, sender_id, primary_url, secondary_url, status, routing, priority } = req.body;
        const id = req.params.id;

        await query(
            'UPDATE sms_gateways SET name = ?, sender_id = ?, primary_url = ?, secondary_url = ?, status = ?, routing = ?, priority = ? WHERE id = ?',
            [name, sender_id || 'NOTIFY', primary_url, secondary_url || null, status || 'active', routing || 'national', priority || 'both', id]
        );

        res.json({ success: true, message: 'Gateway updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * DELETE /api/sms-gateways/:id
 * Delete gateway
 */
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
    try {
        await query('DELETE FROM sms_gateways WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Gateway deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * POST /api/sms-gateways/:id/test
 * Test gateway connectivity
 */
router.post('/:id/test', authenticate, requireAdmin, async (req, res) => {
    try {
        const [gateways] = await query('SELECT * FROM sms_gateways WHERE id = ?', [req.params.id]);
        if (gateways.length === 0) return res.status(404).json({ success: false, message: 'Gateway not found' });

        const gateway = gateways[0];
        
        // Extract the base URL (host:port) from the primary_url to test connectivity
        try {
            const urlObj = new URL(gateway.primary_url.split('?')[0]);
            const testUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;

            // Try a HEAD request or a limited GET request to check server status
            const response = await axios.get(testUrl, { 
                timeout: 5000, 
                validateStatus: () => true // Accept any status code (2xx, 3xx, 4xx) as "reachable"
            });

            if (response.status >= 200 && response.status < 500) {
                res.json({ 
                    success: true, 
                    message: `Gateway "${gateway.name}" is reachable (Server responded with HTTP ${response.status})`, 
                    statusCode: response.status 
                });
            } else {
                res.json({ 
                    success: false, 
                    message: `Gateway "${gateway.name}" returned a server error (HTTP ${response.status})`, 
                    statusCode: response.status 
                });
            }
        } catch (connErr) {
            res.json({ success: false, message: `Gateway "${gateway.name}" is NOT reachable: ${connErr.message}` });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
