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

        // 2. Fetch detailed logs for CSV
        // Check both message_logs and api_message_logs since it could be from either
        const [logs] = await query(`
            SELECT mobile as Mobile, status as Status, send_time as Sent_Time, delivery_time as Delivery_Time, read_time as Read_Time, failure_reason as Failure_Note
            FROM (
                SELECT recipient as mobile, status, send_time, delivery_time, read_time, failure_reason FROM message_logs WHERE campaign_id = ?
                UNION ALL
                SELECT recipient as mobile, status, send_time, delivery_time, read_time, failure_reason FROM api_message_logs WHERE campaign_id = ?
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
        const isAdminRole = req.user.role === 'superadmin' || req.user.role === 'admin';
        const targetUserId = (isAdminRole && userId) ? userId : req.user.id;

        let params = [];
        let dateFilter = '';
        if (from) { dateFilter += ' AND created_at >= ?'; params.push(from + ' 00:00:00'); }
        if (to) { dateFilter += ' AND created_at <= ?'; params.push(to + ' 23:59:59'); }

        const queryStr = `
            SELECT * FROM (
                -- 1. Link Clicks
                SELECT 
                    'Link Click' as type,
                    lc.mobile as msisdn,
                    lc.original_url as interaction,
                    COALESCE(c.name, aml.campaign_name, 'Unknown') as campaign_name,
                    lc.created_at as timestamp
                FROM link_clicks lc
                LEFT JOIN campaigns c ON lc.campaign_id = c.id
                LEFT JOIN (SELECT DISTINCT campaign_id, campaign_name FROM api_message_logs) aml ON lc.campaign_id = aml.campaign_id
                WHERE lc.user_id = ? ${dateFilter}

                UNION ALL

                -- 2. Button/Interactive Replies
                SELECT 
                    'Button Click' as type,
                    wl.sender as msisdn,
                    wl.message_content as interaction,
                    'N/A' as campaign_name, -- Logic for campaign name in webhook_logs is complex, keeping simple for now
                    wl.created_at as timestamp
                FROM webhook_logs wl
                WHERE wl.user_id = ? 
                AND (wl.message_content LIKE 'User is Interested%' OR wl.message_content LIKE 'User Clicked%')
                ${dateFilter.replace('created_at', 'wl.created_at')}
            ) as engagement_data
            ORDER BY timestamp DESC
            LIMIT 500
        `;

        let rows = [];
        try {
            const [data] = await query(queryStr, [targetUserId, ...params, targetUserId, ...params]);
            rows = data || [];
        } catch (dbErr) {
            console.error('Engagement DB Error (Possibly missing table):', dbErr.message);
            rows = [];
        }
        
        // Final cleaning of interaction text if needed
        const reports = rows.map(r => ({
            ...r,
            interaction: r.interaction.split(' - Campaign:')[0].replace('User is Interested!', '🟢 Interested').replace('User Clicked:', '🔘 Clicked:')
        }));

        res.json({ success: true, reports });

    } catch (error) {
        console.error('Engagement report error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch engagement reports' });
    }
});

module.exports = router;
