const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const authenticate = require('../middleware/authMiddleware');
const { sendEmail } = require('../utils/emailService');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const { Parser } = require('json2csv');

// GET /api/reports/summary
router.get('/summary', authenticate, async (req, res) => {
    try {
        const { from, to, channel, status, userId } = req.query;

        // Use targetUserId if provided and user is admin, else use own id
        let isResellerRole = req.user.role === 'reseller';
        let isAdminRole = req.user.role === 'superadmin' || req.user.role === 'admin';
        let targetUserId = req.user.id;

        if ((isAdminRole || isResellerRole) && userId) {
            targetUserId = userId;
        }

        // Base filter conditions
        let conditions = [];
        let params = [];

        if (targetUserId !== 'all') {
            if (isResellerRole && targetUserId != req.user.id) {
                // Safety: Can only see if they are a client of this reseller
                const actualResellerId = req.user.actual_reseller_id || req.user.id;
                conditions.push("(c.user_id = ? AND c.user_id IN (SELECT id FROM users WHERE reseller_id = ?))");
                params.push(targetUserId, actualResellerId);
            } else {
                conditions.push("c.user_id = ?");
                params.push(targetUserId);
            }
        } else if (isResellerRole) {
            // Reseller wants all: include themselves and ALL their clients
            const actualResellerId = req.user.actual_reseller_id || req.user.id;
            conditions.push("(c.user_id = ? OR c.user_id IN (SELECT id FROM users WHERE reseller_id = ?))");
            params.push(req.user.id, actualResellerId);
        }
        // If Admin and targetUserId is 'all', no condition is pushed (standard admin view)

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

        // 1. Overall Totals (Manual + API)
        const [totals] = await query(`
            SELECT 
                COALESCE(SUM(sent), 0) as sent,
                COALESCE(SUM(delivered), 0) as delivered,
                COALESCE(SUM(failed), 0) as failed,
                COALESCE(SUM(cost), 0) as cost
            FROM (
                SELECT 
                    COALESCE(sent_count, 0) as sent,
                    COALESCE(delivered_count, 0) as delivered,
                    COALESCE(failed_count, 0) as failed,
                    (COALESCE(sent_count, 0) + COALESCE(failed_count, 0)) * 0.25 as cost
                FROM campaigns c
                ${whereClause}
                UNION ALL
                SELECT 
                    COALESCE(sent_count, 0) as sent,
                    COALESCE(delivered_count, 0) as delivered,
                    COALESCE(failed_count, 0) as failed,
                    (COALESCE(sent_count, 0) + COALESCE(failed_count, 0)) * 0.25 as cost
                FROM api_campaigns c
                ${whereClause}
            ) as combined_totals
        `, [...params, ...params]);

        // 2. Group by Channel (Manual + API)
        const [byChannel] = await query(`
            SELECT channel as label, SUM(sent) as sent, SUM(delivered) as delivered, SUM(failed) as failed, 0 as pending, SUM(cost) as cost
            FROM (
                SELECT channel, COALESCE(sent_count, 0) as sent, COALESCE(delivered_count, 0) as delivered, COALESCE(failed_count, 0) as failed, (COALESCE(sent_count, 0) + COALESCE(failed_count, 0)) * 0.25 as cost
                FROM campaigns c
                ${whereClause}
                UNION ALL
                SELECT channel, COALESCE(sent_count, 0) as sent, COALESCE(delivered_count, 0) as delivered, COALESCE(failed_count, 0) as failed, (COALESCE(sent_count, 0) + COALESCE(failed_count, 0)) * 0.25 as cost
                FROM api_campaigns c
                ${whereClause}
            ) as combined_channel
            GROUP BY channel
        `, [...params, ...params]);

        // 3. Group by User (Sender)
        const [byUser] = await query(`
            SELECT u.email as label, SUM(COALESCE(c.recipient_count, c.audience_count, 0)) as sent, SUM(COALESCE(c.recipient_count, c.audience_count, 0) * 0.25) as cost
            FROM campaigns c
            JOIN users u ON c.user_id = u.id
            ${whereClause}
            GROUP BY u.email
            LIMIT 10
        `, params);

        // 4. Group by Date
        const [byDate] = await query(`
             SELECT DATE_FORMAT(c.created_at, '%Y-%m-%d') as label, SUM(COALESCE(c.recipient_count, c.audience_count, 0)) as sent
             FROM campaigns c
             ${whereClause}
             GROUP BY label
             ORDER BY label DESC
             LIMIT 10
        `, params);

        // 5. Incoming Responses (from webhook_logs)
        let incomingWhere = '';
        let incomingParams = [];
        if (targetUserId !== 'all') {
            incomingWhere = 'WHERE user_id = ? AND status = "received"';
            incomingParams = [targetUserId];
        } else {
            incomingWhere = 'WHERE status = "received"';
        }
        
        const [byResponse] = await query(`
            SELECT type as label, COUNT(*) as count 
            FROM webhook_logs 
            ${incomingWhere}
            GROUP BY type
        `, incomingParams);

        res.json({
            success: true,
            summary: {
                total: totals[0],
                byChannel,
                byUser,
                byDate,
                byResponse
            }
        });

    } catch (error) {
        console.error('Reports summary error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch summary reports' });
    }
});

// GET /api/reports/queue-status
// Real-time monitoring of campaign queues
router.get('/queue-status', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'superadmin' && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        const [rows] = await query(`
            SELECT channel, status, COUNT(*) as count 
            FROM campaign_queue 
            GROUP BY channel, status
        `);

        const [apiRows] = await query(`
            SELECT 'API' as channel, status, COUNT(*) as count 
            FROM api_campaign_queue 
            GROUP BY status
        `);

        // Format into a structured response
        const queues = [
            { name: 'WhatsApp Queue', count: rows.filter(r => r.channel === 'whatsapp').reduce((acc, curr) => acc + curr.count, 0) },
            { name: 'RCS Queue', count: rows.filter(r => r.channel === 'rcs').reduce((acc, curr) => acc + curr.count, 0) },
            { name: 'SMS Queue', count: rows.filter(r => r.channel === 'sms').reduce((acc, curr) => acc + curr.count, 0) },
            { name: 'API Queue', count: apiRows.reduce((acc, curr) => acc + curr.count, 0) }
        ];

        res.json({ success: true, queues });
    } catch (error) {
        console.error('Queue status error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch queue status' });
    }
});

// GET /api/reports/user-summary
// Aggregated report for SMS/WhatsApp/RCS by user and date
router.get('/user-summary', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'superadmin' && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        const { channel, from, to, userId } = req.query;
        let conditions = [];
        let params = [];

        if (channel && channel !== 'all') {
            conditions.push("c.channel = ?");
            params.push(channel);
        }
        if (from) {
            conditions.push("c.created_at >= ?");
            params.push(from + ' 00:00:00');
        }
        if (to) {
            conditions.push("c.created_at <= ?");
            params.push(to + ' 23:59:59');
        }
        if (userId && userId !== 'all') {
            conditions.push("c.user_id = ?");
            params.push(userId);
        }

        const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

        // Optimized query to fetch aggregated metrics per user per day
        const [rows] = await query(`
            SELECT 
                u.id as user_id,
                u.email as username,
                u.company,
                DATE(c.created_at) as summary_date,
                COALESCE(SUM(c.recipient_count), 0) as total_sent,
                COALESCE(SUM(c.delivered_count), 0) as delivered,
                COALESCE(SUM(c.sent_count), 0) as submitted,
                COALESCE(SUM(c.failed_count), 0) as failed,
                COALESCE(SUM(c.read_count), 0) as read_count,
                'prepaid' as billing -- Hardcoded for now based on wallet system
            FROM campaigns c
            JOIN users u ON c.user_id = u.id
            ${whereClause}
            GROUP BY u.id, summary_date
            ORDER BY summary_date DESC, total_sent DESC
            LIMIT 500
        `, params);

        res.json({ success: true, summary: rows });
    } catch (error) {
        console.error('User summary error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch user summary' });
    }
});

// GET /api/reports/today-summary
// Real-time report for current day's activities across all users
router.get('/today-summary', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'superadmin' && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        const today = new Date().toISOString().split('T')[0];

        // Fetch counts for today from both manual and API campaigns
        const [rows] = await query(`
            SELECT 
                u.email as username,
                u.company,
                c.channel,
                SUM(c.recipient_count) as total,
                SUM(c.sent_count) as submitted,
                SUM(c.delivered_count) as delivered,
                SUM(c.failed_count) as failed
            FROM (
                SELECT user_id, channel, recipient_count, sent_count, delivered_count, failed_count, created_at FROM campaigns WHERE created_at >= ?
                UNION ALL
                SELECT user_id, channel, recipient_count, sent_count, delivered_count, failed_count, created_at FROM api_campaigns WHERE created_at >= ?
            ) c
            JOIN users u ON c.user_id = u.id
            GROUP BY u.id, c.channel
            ORDER BY total DESC
        `, [today + ' 00:00:00', today + ' 00:00:00']);

        res.json({ success: true, summary: rows });
    } catch (error) {
        console.error('Today summary error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch today summary' });
    }
});

// GET /api/reports/detail
router.get('/detail', authenticate, async (req, res) => {
    try {
        const { from, to, channel, status, userId } = req.query;

        const isResellerRole = req.user.role === 'reseller';
        const isAdminRole = req.user.role === 'superadmin' || req.user.role === 'admin';
        let targetUserId = req.user.id;

        if ((isAdminRole || isResellerRole) && userId) {
            targetUserId = userId;
        }

        let conditions = [];
        let params = [];

        if (targetUserId !== 'all') {
            if (isResellerRole && targetUserId != req.user.id) {
                // Safety: Can only see if they are a client of this reseller
                const actualResellerId = req.user.actual_reseller_id || req.user.id;
                conditions.push("(c.user_id = ? AND c.user_id IN (SELECT id FROM users WHERE reseller_id = ?))");
                params.push(targetUserId, actualResellerId);
            } else {
                conditions.push("c.user_id = ?");
                params.push(targetUserId);
            }
        } else if (isResellerRole) {
            // Reseller sees themselves + all their clients
            const actualResellerId = req.user.actual_reseller_id || req.user.id;
            conditions.push("(c.user_id = ? OR c.user_id IN (SELECT id FROM users WHERE reseller_id = ?))");
            params.push(req.user.id, actualResellerId);
        }

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

        console.log('Reports Detail Request:', { from, to, channel, status, targetUserId });
        const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
        console.log('SQL:', `SELECT ... ${whereClause}`, params);

        const [rows] = await query(`
            SELECT * FROM (
                SELECT c.id, c.name as campaign_name, c.channel, COALESCE(c.recipient_count, c.audience_count, 0) as recipient_count, c.status, c.created_at as timestamp, u.company, u.email as user_email
                FROM campaigns c
                LEFT JOIN users u ON c.user_id = u.id
                ${whereClause}
                UNION ALL
                SELECT c.id, c.name as campaign_name, c.channel, COALESCE(c.recipient_count, c.audience_count, 0) as recipient_count, c.status, c.created_at as timestamp, u.company, u.email as user_email
                FROM api_campaigns c
                LEFT JOIN users u ON c.user_id = u.id
                ${whereClause}
            ) as combined_detail
            ORDER BY timestamp DESC
            LIMIT 100
        `, [...params, ...params]);
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
            cost: (r.recipient_count || 0) * 0.25, // Mock cost logic
            recipient_count: r.recipient_count
        }));

        res.json({ success: true, reports });

    } catch (error) {
        console.error('Reports detail error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch detailed reports' });
    }
});

// GET /api/reports/export
router.get('/export', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const { from, to, channel, status, format } = req.query;
        console.log('Export Request:', { from, to, channel, status, format, userId });

        const isResellerRole = req.user.role === 'reseller';
        const isAdminRole = req.user.role === 'superadmin' || req.user.role === 'admin';
        let targetUserId = req.user.id;

        if ((isAdminRole || isResellerRole) && req.query.userId) {
            targetUserId = req.query.userId;
        }

        let conditions = [];
        let params = [];

        if (targetUserId !== 'all') {
            if (isResellerRole && targetUserId != req.user.id) {
                // Safety: Can only see if they are a client of this reseller
                const actualResellerId = req.user.actual_reseller_id || req.user.id;
                conditions.push("(c.user_id = ? AND c.user_id IN (SELECT id FROM users WHERE reseller_id = ?))");
                params.push(targetUserId, actualResellerId);
            } else {
                conditions.push("c.user_id = ?");
                params.push(targetUserId);
            }
        } else if (isResellerRole) {
            // Reseller sees themselves + all their clients
            const actualResellerId = req.user.actual_reseller_id || req.user.id;
            conditions.push("(c.user_id = ? OR c.user_id IN (SELECT id FROM users WHERE reseller_id = ?))");
            params.push(req.user.id, actualResellerId);
        }

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
            SELECT * FROM (
                SELECT c.id, c.name as campaign_name, c.channel, c.recipient_count, c.sent_count, c.status, c.created_at as timestamp, u.company, u.email as user_email
                FROM campaigns c
                LEFT JOIN users u ON c.user_id = u.id
                ${whereClause}
                UNION ALL
                SELECT c.id, c.name as campaign_name, c.channel, c.recipient_count, c.sent_count, c.status, c.created_at as timestamp, u.company, u.email as user_email
                FROM api_campaigns c
                LEFT JOIN users u ON c.user_id = u.id
                ${whereClause}
            ) as combined_export
            ORDER BY timestamp DESC
            LIMIT 5000
        `, [...params, ...params]);

        const data = rows.map(r => ({
            'MSISDN': r.recipient_count > 1 ? `Multiple (${r.recipient_count})` : 'Single',
            'Sender': r.company || r.user_email || 'Unknown',
            'Message': r.campaign_name,
            'Status': r.status,
            'Channel': r.channel,
            'Sent Time': new Date(r.timestamp).toLocaleString(),
            'Credits Used': (r.sent_count || 0)
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

// POST /api/reports/send-campaign-report
router.post('/send-campaign-report', authenticate, async (req, res) => {
    try {
        const { campaignId } = req.body;
        if (!campaignId) return res.status(400).json({ success: false, message: 'Campaign ID required' });

        // 1. Fetch campaign data
        const [campaigns] = await query(`
            SELECT c.*, u.email as user_email, u.name as user_name, u.company
            FROM campaigns c
            LEFT JOIN users u ON c.user_id = u.id
            WHERE c.id = ?
        `, [campaignId]);

        if (campaigns.length === 0) {
            return res.status(404).json({ success: false, message: 'Campaign not found' });
        }

        const c = campaigns[0];
        const recipientEmail = c.user_email;

        if (!recipientEmail) {
            return res.status(400).json({ success: false, message: 'User email not found' });
        }

        // Fetch channel stats for breakdown
        const logsTableForStats = campaignId.startsWith('CAMP_API_') ? 'api_message_logs' : 'message_logs';
        const [channelStats] = await query(`
            SELECT channel, status, COUNT(*) as count 
            FROM ${logsTableForStats} 
            WHERE campaign_id = ? 
            GROUP BY channel, status
        `, [campaignId]);

        // Parse channel stats
        const breakdown = {};
        for (const stat of channelStats) {
            const chan = (stat.channel || '').toLowerCase();
            const status = (stat.status || '').toLowerCase();
            const count = parseInt(stat.count || 0, 10);
            
            if (!breakdown[chan]) {
                breakdown[chan] = { sent: 0, delivered: 0, read: 0, failed: 0 };
            }
            
            if (status === 'read' || status === 'displayed' || status === 'read_receipt') {
                breakdown[chan].read += count;
                breakdown[chan].delivered += count;
                breakdown[chan].sent += count;
            } else if (status === 'delivered') {
                breakdown[chan].delivered += count;
                breakdown[chan].sent += count;
            } else if (status === 'failed') {
                breakdown[chan].failed += count;
                breakdown[chan].sent += count;
            } else if (status === 'sent' || status === 'submitted' || status === 'success') {
                breakdown[chan].sent += count;
            }
        }

        let breakdownHtml = '';
        if (Object.keys(breakdown).length > 0) {
            breakdownHtml = `
                <h3 style="color: #2563eb; margin-top: 30px;">Channel Performance Breakdown</h3>
                <table border="1" cellpadding="8" cellspacing="0" style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                    <tr style="background-color: #f2f2f2;">
                        <th>Channel</th>
                        <th>Sent</th>
                        <th>Delivered</th>
                        <th>Read</th>
                        <th>Failed</th>
                    </tr>
            `;
            
            for (const [chan, stats] of Object.entries(breakdown)) {
                const channelName = chan.toUpperCase();
                const readDisplay = chan === 'sms' ? '-' : stats.read;
                breakdownHtml += `
                    <tr>
                        <td><b>${channelName}</b></td>
                        <td>${stats.sent}</td>
                        <td>${stats.delivered}</td>
                        <td>${readDisplay}</td>
                        <td>${stats.failed}</td>
                    </tr>
                `;
            }
            
            breakdownHtml += `</table>`;
        }

        // 2. Fetch detailed logs for CSV
        // Check both message_logs and api_message_logs since it could be from either
        const [logs] = await query(`
            SELECT mobile as Mobile, channel as Channel, status as Status, send_time as Sent_Time, delivery_time as Delivery_Time, read_time as Read_Time, failure_reason as Failure_Note
            FROM (
                SELECT recipient as mobile, channel, status, send_time, delivery_time, read_time, failure_reason FROM message_logs WHERE campaign_id = ?
                UNION ALL
                SELECT recipient as mobile, channel, status, send_time, delivery_time, read_time, failure_reason FROM api_message_logs WHERE campaign_id = ?
            ) as combined_logs
        `, [campaignId, campaignId]);

        // 3. Generate CSV & ZIP
        let zipLink = null;
        try {
            if (logs.length > 0) {
                const json2csvParser = new Parser();
                
                const csv = json2csvParser.parse(logs);

                const zip = new AdmZip();
                zip.addFile(`Report_${campaignId}.csv`, Buffer.from(csv, 'utf8'));

                const reportsDir = path.join(__dirname, '../uploads/reports');
                if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

                const zipFilename = `Campaign_Report_${campaignId}_${Date.now()}.zip`;
                const zipPath = path.join(reportsDir, zipFilename);
                zip.writeZip(zipPath);

                // Assuming the server is reachable via VITE_RCS_API_URL or similar
                // For now, providing the path relative to server root
                const baseUrl = process.env.VITE_RCS_API_URL || 'http://localhost:5000';
                zipLink = `${baseUrl}/uploads/reports/${zipFilename}`;
            }
        } catch (err) {
            console.error('Error generating ZIP:', err);
        }

        // 4. Format HTML Body (Professional "Dear Sir" Template)
        const subject = `Detailed Campaign Report: ${c.name}`;
        const body = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px;">
                <h2 style="color: #2563eb; text-align: center;">Campaign Performance Report</h2>
                <p>Dear Sir/Madam,</p>
                <p>Please find the detailed report for your campaign: <b>${c.name}</b></p>
                
                <table border="1" cellpadding="8" cellspacing="0" style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                    <tr style="background-color: #f2f2f2;">
                        <th>Metric</th>
                        <th>Count</th>
                        <th>Percentage</th>
                    </tr>
                    <tr>
                        <td><b>Total Base</b></td>
                        <td>${c.recipient_count}</td>
                        <td>100%</td>
                    </tr>
                    <tr style="color: #2563eb;">
                        <td>Successfully Sent</td>
                        <td>${c.sent_count}</td>
                        <td>${((c.sent_count / c.recipient_count) * 100).toFixed(1)}%</td>
                    </tr>
                    <tr style="color: #16a34a;">
                        <td>Delivered</td>
                        <td>${c.delivered_count}</td>
                        <td>${((c.delivered_count / c.recipient_count) * 100).toFixed(1)}%</td>
                    </tr>
                    <tr style="color: #9333ea;">
                        <td>Read Receipts</td>
                        <td>${c.read_count}</td>
                        <td>${((c.read_count / c.recipient_count) * 100).toFixed(1)}%</td>
                    </tr>
                    <tr style="color: #dc2626;">
                        <td>Failed/Rejected</td>
                        <td>${c.failed_count}</td>
                        <td>${((c.failed_count / c.recipient_count) * 100).toFixed(1)}%</td>
                    </tr>
                </table>

                ${breakdownHtml}

                ${zipLink ? `
                <div style="margin-top: 20px; padding: 15px; border: 2px dashed #2563eb; text-align: center; background-color: #f8fafc;">
                    <p><b>Detailed Logs (CSV):</b></p>
                    <a href="${zipLink}" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Download ZIP Report</a>
                </div>
                ` : ''}

                <p style="margin-top: 30px;">
                    Regards,<br>
                    <b>Operations Team</b><br>
                    NotifyNow Solutions
                </p>
            </div>
        `;

        // 5. Send Email
        await sendEmail(recipientEmail, subject, body);

        res.json({ success: true, message: `Detailed report sent to ${recipientEmail}` });

    } catch (error) {
        console.error('Send detailed campaign report error:', error);
        res.status(500).json({ success: false, message: 'Failed to generate or send detailed report' });
    }
});

// GET /api/reports/engagement (Merged Click & Button Interactions)
router.get('/engagement', authenticate, async (req, res) => {
    try {
        const { from, to, userId } = req.query;
        const isResellerRole = req.user.role === 'reseller';
        const isAdminRole = req.user.role === 'superadmin' || req.user.role === 'admin';
        let targetUserId = req.user.id;

        if ((isAdminRole || isResellerRole) && userId) {
            targetUserId = userId;
        }

        let lcUserCondition = '';
        let wlUserCondition = '';
        let lcParams = [];
        let wlParams = [];

        if (targetUserId !== 'all') {
            if (isResellerRole && targetUserId != req.user.id) {
                // Safety: Can only see if they are a client of this reseller
                const actualResellerId = req.user.actual_reseller_id || req.user.id;
                lcUserCondition = 'AND lc.user_id = ? AND lc.user_id IN (SELECT id FROM users WHERE reseller_id = ?)';
                wlUserCondition = 'AND wl.user_id = ? AND wl.user_id IN (SELECT id FROM users WHERE reseller_id = ?)';
                lcParams.push(targetUserId, actualResellerId);
                wlParams.push(targetUserId, actualResellerId);
            } else {
                lcUserCondition = 'AND lc.user_id = ?';
                wlUserCondition = 'AND wl.user_id = ?';
                lcParams.push(targetUserId);
                wlParams.push(targetUserId);
            }
        } else if (isResellerRole) {
            // Reseller wants all: include themselves and ALL their clients
            const actualResellerId = req.user.actual_reseller_id || req.user.id;
            lcUserCondition = 'AND (lc.user_id = ? OR lc.user_id IN (SELECT id FROM users WHERE reseller_id = ?))';
            wlUserCondition = 'AND (wl.user_id = ? OR wl.user_id IN (SELECT id FROM users WHERE reseller_id = ?))';
            lcParams.push(req.user.id, actualResellerId);
            wlParams.push(req.user.id, actualResellerId);
        }

        let lcDateFilter = '';
        let wlDateFilter = '';
        let dateParams = [];
        if (from) {
            lcDateFilter += ' AND lc.created_at >= ?';
            wlDateFilter += ' AND wl.created_at >= ?';
            dateParams.push(from + ' 00:00:00');
        }
        if (to) {
            lcDateFilter += ' AND lc.created_at <= ?';
            wlDateFilter += ' AND wl.created_at <= ?';
            dateParams.push(to + ' 23:59:59');
        }

        const queryStr = `
            SELECT * FROM (
                -- 1. Link Clicks (Now called URL CLICKED)
                SELECT 
                    'URL CLICKED' as type,
                    lc.mobile as msisdn,
                    lc.original_url as interaction,
                    COALESCE(c.name, ac.name, 'Unknown') as campaign_name,
                    lc.created_at as timestamp
                FROM link_clicks lc
                LEFT JOIN campaigns c ON lc.campaign_id = c.id
                LEFT JOIN api_campaigns ac ON lc.campaign_id = ac.id
                WHERE 1=1 ${lcUserCondition} ${lcDateFilter}

                UNION ALL

                -- 2. Button/Interactive Replies (Sequential subqueries for better scope)
                SELECT 
                    'BUTTON CLICK' as type,
                    wl.sender as msisdn,
                    wl.message_content as interaction,
                    COALESCE(
                        wl.campaign_name,
                        (SELECT campaign_name FROM message_logs WHERE recipient = wl.sender AND user_id = wl.user_id ORDER BY created_at DESC LIMIT 1),
                        (SELECT campaign_name FROM api_message_logs WHERE recipient = wl.sender AND user_id = wl.user_id ORDER BY send_time DESC LIMIT 1),
                        'API Campaign'
                    ) as campaign_name,
                    wl.created_at as timestamp
                FROM webhook_logs wl
                WHERE 1=1 ${wlUserCondition} 
                AND (wl.message_content LIKE 'User is Interested%' OR wl.message_content LIKE 'User Selected%')
                ${wlDateFilter}
            ) as engagement_data
            ORDER BY timestamp DESC
            LIMIT 500
        `;

        const queryParams = [...lcParams, ...dateParams, ...wlParams, ...dateParams];

        let dataRows = [];
        try {
            const [rows] = await query(queryStr, queryParams);
            dataRows = rows || [];
        } catch (dbErr) {
            console.error('Engagement DB Error:', dbErr.message);
            dataRows = [];
        }
        
        // Final cleaning of interaction text if needed
        // Final cleaning of interaction text and apply masking if permission enabled
        let reports = dataRows.map(r => ({
            ...r,
            interaction: r.interaction.split(' (Campaign:')[0]
        }));

        if (req.user.permissions && req.user.permissions.includes('Reports - Mask Mobile')) {
            reports = reports.map(r => ({
                ...r,
                msisdn: (r.msisdn && r.msisdn.length > 5) 
                    ? r.msisdn.substring(0, r.msisdn.length - 5) + 'xxxxx' 
                    : r.msisdn
            }));
        }

        res.json({ success: true, reports });

    } catch (error) {
        console.error('Engagement report error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch engagement reports' });
    }
});

// POST /api/reports/recalculate/:campaignId
// Recalculate and fix campaign counters from actual message_logs (Admin only)
router.post('/recalculate/:campaignId', authenticate, async (req, res) => {
    try {
        const isAdmin = req.user.role === 'superadmin' || req.user.role === 'admin';
        const { campaignId } = req.params;

        // Determine table (manual vs API campaign)
        let campaignRow = null;
        let tableType = 'manual';

        const [manualCamp] = await query('SELECT * FROM campaigns WHERE id = ?', [campaignId]);
        if (manualCamp.length > 0) {
            campaignRow = manualCamp[0];
            tableType = 'manual';
        } else {
            const [apiCamp] = await query('SELECT * FROM api_campaigns WHERE id = ?', [campaignId]);
            if (apiCamp.length > 0) {
                campaignRow = apiCamp[0];
                tableType = 'api';
            }
        }

        // Check ownership
        if (!campaignRow) return res.status(404).json({ success: false, message: 'Campaign not found' });
        if (!isAdmin && campaignRow.user_id !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        const logsTable = tableType === 'api' ? 'api_message_logs' : 'message_logs';
        const campTable = tableType === 'api' ? 'api_campaigns' : 'campaigns';

        // Count from logs
        const [statusCounts] = await query(`
            SELECT status, COUNT(*) as count, COUNT(DISTINCT recipient) as unique_recipients
            FROM ${logsTable}
            WHERE campaign_id = ?
            GROUP BY status
        `, [campaignId]);

        let sent = 0, delivered = 0, read = 0, failed = 0, total = 0;
        for (const row of statusCounts) {
            const st = (row.status || '').toLowerCase();
            const cnt = Number(row.count || 0);
            total += cnt;
            if (['sent', 'submitted', 'success', 'accepted'].includes(st)) sent += cnt;
            if (st === 'delivered') { delivered += cnt; sent += cnt; }
            if (['read', 'displayed', 'read_receipt', 'seen'].includes(st)) { read += cnt; delivered += cnt; sent += cnt; }
            if (['failed', 'rejected', 'expired', 'undeliverable'].includes(st)) failed += cnt;
        }

        // Update the campaign table
        await query(`
            UPDATE ${campTable}
            SET sent_count = ?, delivered_count = ?, read_count = ?, failed_count = ?
            WHERE id = ?
        `, [sent, delivered, read, failed, campaignId]);

        res.json({
            success: true,
            message: `Campaign recalculated from ${logsTable}`,
            campaign_id: campaignId,
            old: {
                sent: campaignRow.sent_count,
                delivered: campaignRow.delivered_count,
                read: campaignRow.read_count,
                failed: campaignRow.failed_count
            },
            new: { sent, delivered, read, failed },
            total_log_rows: total,
            breakdown: statusCounts
        });
    } catch (error) {
        console.error('Recalculate error:', error);
        res.status(500).json({ success: false, message: 'Failed to recalculate campaign' });
    }
});

// GET /api/reports/day-summary?date=2026-06-05&userId=optional
// Full detailed report for a day - all campaigns with per-campaign stats
router.get('/day-summary', authenticate, async (req, res) => {
    try {
        const isAdmin = req.user.role === 'superadmin' || req.user.role === 'admin';
        const { date, userId } = req.query;

        const targetDate = date || new Date().toISOString().split('T')[0];
        const dateFrom = targetDate + ' 00:00:00';
        const dateTo   = targetDate + ' 23:59:59';

        let userFilter = '';
        let params = [dateFrom, dateTo];

        if (isAdmin && userId && userId !== 'all') {
            userFilter = 'AND c.user_id = ?';
            params.push(userId);
        } else if (!isAdmin) {
            userFilter = 'AND c.user_id = ?';
            params.push(req.user.id);
        }

        const [campaigns] = await query(`
            SELECT 
                c.id,
                c.name,
                c.channel,
                c.status,
                c.created_at,
                COALESCE(c.recipient_count, c.audience_count, 0) as total,
                COALESCE(c.sent_count, 0) as sent,
                COALESCE(c.delivered_count, 0) as delivered,
                COALESCE(c.read_count, 0) as read_count,
                COALESCE(c.failed_count, 0) as failed,
                u.email as user_email,
                u.company
            FROM campaigns c
            LEFT JOIN users u ON c.user_id = u.id
            WHERE c.created_at BETWEEN ? AND ? ${userFilter}
            ORDER BY c.created_at DESC
        `, params);

        // Compute totals
        const totals = campaigns.reduce((acc, c) => {
            acc.total += Number(c.total);
            acc.sent += Number(c.sent);
            acc.delivered += Number(c.delivered);
            acc.read += Number(c.read_count);
            acc.failed += Number(c.failed);
            return acc;
        }, { total: 0, sent: 0, delivered: 0, read: 0, failed: 0 });

        // Delivery rate
        const deliveryRate = totals.sent > 0 ? ((totals.delivered / totals.sent) * 100).toFixed(1) : '0.0';
        const readRate = totals.sent > 0 ? ((totals.read / totals.sent) * 100).toFixed(1) : '0.0';
        const failRate = totals.sent > 0 ? ((totals.failed / totals.sent) * 100).toFixed(1) : '0.0';

        res.json({
            success: true,
            date: targetDate,
            summary: {
                total_campaigns: campaigns.length,
                totals,
                delivery_rate: deliveryRate + '%',
                read_rate: readRate + '%',
                fail_rate: failRate + '%'
            },
            campaigns
        });
    } catch (error) {
        console.error('Day summary error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch day summary' });
    }
});

module.exports = router;

