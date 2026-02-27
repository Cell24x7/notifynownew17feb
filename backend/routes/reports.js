const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const authenticateToken = require('../middleware/authMiddleware');
const { sendEmail } = require('../utils/emailService');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const { Parser } = require('json2csv');

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
router.post('/send-campaign-report', authenticateToken, async (req, res) => {
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
        const [logs] = await query(`
            SELECT recipient as Mobile, status as Status, 
                   send_time as Sent_Time, delivery_time as Delivery_Time, 
                   read_time as Read_Time, failure_reason as Failure_Note
            FROM message_logs 
            WHERE campaign_id = ?
        `, [campaignId]);

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

module.exports = router;
