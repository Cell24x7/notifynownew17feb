const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const authenticateToken = require('../middleware/authMiddleware');

// GET /api/reports/summary
router.get('/summary', async (req, res) => {
    try {
        const { from, to, channel, status } = req.query;

        // Base filter conditions
        let conditions = ["1=1"];
        let params = [];

        if (from) {
            conditions.push("c.created_at >= ?");
            params.push(from + ' 00:00:00');
        }
        if (to) {
            conditions.push("c.created_at <= ?");
            params.push(to + ' 23:59:59');
        }
        if (channel && channel !== 'all') {
            conditions.push("c.channel = ?");
            params.push(channel);
        }
        if (status && status !== 'all') {
            conditions.push("c.status = ?");
            params.push(status);
        }

        const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

        // 1. Overall Totals
        const [totals] = await query(`
            SELECT 
                COALESCE(SUM(audience_count), 0) as sent,
                COALESCE(SUM(CASE WHEN status = 'completed' THEN audience_count ELSE 0 END), 0) as delivered,
                COALESCE(SUM(CASE WHEN status = 'failed' THEN audience_count ELSE 0 END), 0) as failed,
                COALESCE(SUM(audience_count * 0.25), 0) as cost -- Estimated cost (0.25 per msg)
            FROM campaigns c
            ${whereClause}
        `, params);

        // 2. Group by Channel
        const [byChannel] = await query(`
            SELECT channel as label, SUM(audience_count) as sent, 0 as delivered, 0 as failed, 0 as pending, SUM(audience_count * 0.25) as cost
            FROM campaigns c
            ${whereClause}
            GROUP BY channel
        `, params);

        // 3. Group by User (Sender)
        const [byUser] = await query(`
            SELECT u.email as label, SUM(c.audience_count) as sent, SUM(c.audience_count * 0.25) as cost
            FROM campaigns c
            JOIN users u ON c.user_id = u.id
            ${whereClause}
            GROUP BY u.email
            LIMIT 10
        `, params);

        // 4. Group by Date
        const [byDate] = await query(`
             SELECT DATE_FORMAT(c.created_at, '%Y-%m-%d') as label, SUM(c.audience_count) as sent
             FROM campaigns c
             ${whereClause}
             GROUP BY label
             ORDER BY label DESC
             LIMIT 10
        `, params);

        res.json({
            success: true,
            summary: {
                total: totals[0],
                byChannel,
                byUser,
                byDate
            }
        });

    } catch (error) {
        console.error('Reports summary error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch summary reports' });
    }
});

// GET /api/reports/detail
router.get('/detail', async (req, res) => {
    try {
        const { from, to, channel, status } = req.query;

        let conditions = ["1=1"];
        let params = [];

        if (from) {
            conditions.push("c.created_at >= ?");
            params.push(from + ' 00:00:00');
        }
        if (to) {
            conditions.push("c.created_at <= ?");
            params.push(to + ' 23:59:59');
        }
        if (channel && channel !== 'all') {
            conditions.push("c.channel = ?");
            params.push(channel);
        }
        if (status && status !== 'all') {
            conditions.push("c.status = ?");
            params.push(status);
        }

        console.log('Reports Detail Request:', { from, to, channel, status });
        const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
        console.log('SQL:', `SELECT ... ${whereClause}`, params);

        const [rows] = await query(`
            SELECT 
                c.id,
                c.name as campaign_name,
                c.channel,
                c.audience_count,
                c.status,
                c.created_at as timestamp,
                u.company,
                u.email as user_email
            FROM campaigns c
            LEFT JOIN users u ON c.user_id = u.id
            ${whereClause}
            ORDER BY c.created_at DESC
            LIMIT 100
        `, params);
        console.log('Rows found:', rows.length);

        // Transform for frontend
        const reports = rows.map(r => ({
            id: r.id,
            msisdn: 'N/A', // Campaigns don't have single MSISDN
            sender: r.company || r.user_email || 'Unknown',
            message: r.campaign_name, // Use campaign name as message
            status: r.status,
            channel: r.channel,
            timestamp: r.timestamp,
            dlrTime: r.timestamp, // Placeholder
            cost: (r.audience_count || 0) * 0.25, // Mock cost logic
            audience_count: r.audience_count
        }));

        res.json({ success: true, reports });

    } catch (error) {
        console.error('Reports detail error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch detailed reports' });
    }
});

// GET /api/reports/export
router.get('/export', async (req, res) => {
    try {
        const { from, to, channel, status, format } = req.query;
        console.log('Export Request:', { from, to, channel, status, format });

        let conditions = ["1=1"];
        let params = [];

        if (from) {
            conditions.push("c.created_at >= ?");
            params.push(from + ' 00:00:00');
        }
        if (to) {
            conditions.push("c.created_at <= ?");
            params.push(to + ' 23:59:59');
        }
        if (channel && channel !== 'all') {
            conditions.push("c.channel = ?");
            params.push(channel);
        }
        if (status && status !== 'all') {
            conditions.push("c.status = ?");
            params.push(status);
        }

        const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

        // Fetch ALL matching records (no limit)
        const [rows] = await query(`
            SELECT 
                c.id,
                c.name as campaign_name,
                c.channel,
                c.audience_count,
                c.status,
                c.created_at as timestamp,
                u.company,
                u.email as user_email
            FROM campaigns c
            LEFT JOIN users u ON c.user_id = u.id
            ${whereClause}
            ORDER BY c.created_at DESC
        `, params);

        const data = rows.map(r => ({
            'MSISDN': r.audience_count > 1 ? `Multiple (${r.audience_count})` : 'Single',
            'Sender': r.company || r.user_email || 'Unknown',
            'Message': r.campaign_name,
            'Status': r.status,
            'Channel': r.channel,
            'Sent Time': new Date(r.timestamp).toLocaleString(),
            'Cost': ((r.audience_count || 0) * 0.25).toFixed(2)
        }));

        if (format === 'csv') {
            const { Parser } = require('json2csv');
            const json2csvParser = new Parser();
            const csv = json2csvParser.parse(data);
            res.header('Content-Type', 'text/csv');
            res.attachment('reports.csv');
            return res.send(csv);
        }

        else if (format === 'excel') {
            const ExcelJS = require('exceljs');
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Reports');

            worksheet.columns = [
                { header: 'MSISDN', key: 'MSISDN', width: 20 },
                { header: 'Sender', key: 'Sender', width: 25 },
                { header: 'Message', key: 'Message', width: 40 },
                { header: 'Status', key: 'Status', width: 15 },
                { header: 'Channel', key: 'Channel', width: 15 },
                { header: 'Sent Time', key: 'Sent Time', width: 25 },
                { header: 'Cost', key: 'Cost', width: 10 },
            ];

            worksheet.addRows(data);
            res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.attachment('reports.xlsx');
            return await workbook.xlsx.write(res);
        }

        else if (format === 'pdf') {
            const PDFDocument = require('pdfkit');
            const doc = new PDFDocument();
            res.header('Content-Type', 'application/pdf');
            res.attachment('reports.pdf');
            doc.pipe(res);

            doc.fontSize(20).text('Campaign Reports', { align: 'center' });
            doc.moveDown();

            data.forEach((item, index) => {
                doc.fontSize(12).text(`${index + 1}. ${item['Message']} (${item['Status']})`);
                doc.fontSize(10).text(`   Sender: ${item['Sender']} | Channel: ${item['Channel']} | Date: ${item['Sent Time']}`);
                doc.moveDown(0.5);
            });

            doc.end();
            return;
        }

        res.status(400).json({ success: false, message: 'Invalid format' });

    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ success: false, message: 'Export failed' });
    }
});

module.exports = router;
