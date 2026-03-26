const express = require('express');
const { query } = require('../config/db');
const authenticate = require('../middleware/authMiddleware');

const router = express.Router();

// Get logs (Super Admin or Reseller)
router.get('/', authenticate, async (req, res) => {
    // Ensure only admin or reseller can access
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin' && req.user.role !== 'reseller') {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const { type, severity, search, startDate, endDate, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    try {
        let whereConditions = ['1=1'];
        let params = [];
        let joinClause = '';

        // Reseller Isolation
        if (req.user.role === 'reseller') {
            joinClause = 'LEFT JOIN users u ON system_logs.user_id = u.id';
            whereConditions.push('u.reseller_id = ?');
            params.push(req.user.actual_reseller_id);
        }

        if (type && type !== 'all') {
            whereConditions.push('system_logs.type = ?');
            params.push(type);
        }

        if (severity && severity !== 'all') {
            whereConditions.push('system_logs.severity = ?');
            params.push(severity);
        }

        if (startDate) {
            whereConditions.push('system_logs.created_at >= ?');
            params.push(startDate);
        }

        if (endDate) {
            whereConditions.push('system_logs.created_at <= ?');
            params.push(endDate);
        }

        if (search) {
            whereConditions.push('(system_logs.action LIKE ? OR system_logs.details LIKE ? OR system_logs.user_name LIKE ? OR system_logs.client_name LIKE ?)');
            const searchParam = `%${search}%`;
            params.push(searchParam, searchParam, searchParam, searchParam);
        }

        const whereClause = whereConditions.join(' AND ');

        // Get Total Count
        const countSql = `SELECT COUNT(*) as total FROM system_logs ${joinClause} WHERE ${whereClause}`;
        const [countRows] = await query(countSql, params);
        const totalLogs = countRows[0].total;

        // Get Logs
        const logsSql = `
            SELECT system_logs.* 
            FROM system_logs 
            ${joinClause} 
            WHERE ${whereClause} 
            ORDER BY system_logs.created_at DESC 
            LIMIT ? OFFSET ?
        `;
        const [logs] = await query(logsSql, [...params, parseInt(limit), parseInt(offset)]);

        // Get Stats (Counts by severity) - Respecting filters
        const statsSql = `
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN severity = 'error' THEN 1 ELSE 0 END) as errors,
                SUM(CASE WHEN severity = 'warning' THEN 1 ELSE 0 END) as warnings,
                SUM(CASE WHEN severity = 'info' THEN 1 ELSE 0 END) as info
            FROM system_logs
            ${joinClause}
            WHERE ${whereClause}
        `;
        const [statsRows] = await query(statsSql, params);

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
                deviceInfo: log.device_info,
                location: log.location,
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
