const express = require('express');
const { query } = require('../config/db');
const authenticate = require('../middleware/authMiddleware');

const router = express.Router();

// Get logs (Super Admin Only)
router.get('/', authenticate, async (req, res) => {
    // Ensure only admin can access
    if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const { type, severity, search, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    try {
        let whereConditions = ['1=1'];
        let params = [];

        if (type && type !== 'all') {
            whereConditions.push('type = ?');
            params.push(type);
        }

        if (severity && severity !== 'all') {
            whereConditions.push('severity = ?');
            params.push(severity);
        }

        if (search) {
            whereConditions.push('(action LIKE ? OR details LIKE ? OR user_name LIKE ? OR client_name LIKE ?)');
            const searchParam = `%${search}%`;
            params.push(searchParam, searchParam, searchParam, searchParam);
        }

        const whereClause = whereConditions.join(' AND ');

        // Get Total Count
        const [countRows] = await query(`SELECT COUNT(*) as total FROM system_logs WHERE ${whereClause}`, params);
        const totalLogs = countRows[0].total;

        // Get Logs
        const [logs] = await query(
            `SELECT * FROM system_logs WHERE ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
            [...params, parseInt(limit), parseInt(offset)]
        );

        // Get Stats (Counts by severity) - independent of filters, usually for dashboard cards
        // Or we can make it respect filters if desired. For now, global stats are usually expected.
        const [statsRows] = await query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN severity = 'error' THEN 1 ELSE 0 END) as errors,
        SUM(CASE WHEN severity = 'warning' THEN 1 ELSE 0 END) as warnings,
        SUM(CASE WHEN severity = 'info' THEN 1 ELSE 0 END) as info
      FROM system_logs
    `);

        res.json({
            success: true,
            logs: logs.map(log => ({
                id: log.id,
                type: log.type,
                action: log.action,
                details: log.details,
                userName: log.user_name,
                clientName: log.client_name,
                ipAddress: log.ip_address,
                severity: log.severity,
                createdAt: log.created_at
            })),
            stats: {
                total: statsRows[0].total || 0,
                errors: statsRows[0].errors || 0,
                warnings: statsRows[0].warnings || 0,
                info: statsRows[0].info || 0
            },
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: totalLogs,
                totalPages: Math.ceil(totalLogs / limit)
            }
        });

    } catch (err) {
        console.error('Error fetching logs:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
