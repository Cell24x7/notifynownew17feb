const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const authenticateToken = require('../middleware/authMiddleware');
const multer = require('multer');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

// Multer config for XLS/XLSX uploads
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'dlt-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    const allowed = [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain'
    ];
    if (allowed.includes(file.mimetype) || file.originalname.match(/\.(xls|xlsx)$/i)) {
        cb(null, true);
    } else {
        cb(new Error('Only XLS and XLSX files are allowed!'), false);
    }
};

const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 }, fileFilter });

// Auto-create table on module load
(async () => {
    try {
        await query(`
            CREATE TABLE IF NOT EXISTS dlt_templates (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                sender VARCHAR(50) NOT NULL,
                template_text TEXT NOT NULL,
                temp_id VARCHAR(50) NOT NULL,
                temp_name VARCHAR(255) DEFAULT '',
                status ENUM('Y','N') DEFAULT 'Y',
                temp_type VARCHAR(100) DEFAULT 'Transactional',
                pe_id VARCHAR(50) DEFAULT NULL,
                hash_id VARCHAR(50) DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_user_id (user_id),
                INDEX idx_sender (sender),
                INDEX idx_temp_id (temp_id),
                UNIQUE KEY idx_user_temp_id (user_id, temp_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        // Add columns if they don't exist (migrations)
        try { await query('ALTER TABLE dlt_templates ADD COLUMN IF NOT EXISTS pe_id VARCHAR(50) AFTER temp_type'); } catch(e) {}
        try { await query('ALTER TABLE dlt_templates ADD COLUMN IF NOT EXISTS hash_id VARCHAR(50) AFTER pe_id'); } catch(e) {}

        console.log('✓ dlt_templates table ready');
    } catch (err) {
        console.error('Error creating dlt_templates table:', err.message);
    }
})();

// GET all DLT templates for user
router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const search = req.query.search || '';
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        let sql = 'SELECT * FROM dlt_templates WHERE user_id = ?';
        let countSql = 'SELECT COUNT(*) as total FROM dlt_templates WHERE user_id = ?';
        const params = [userId];
        const countParams = [userId];

        if (search) {
            sql += ' AND (sender LIKE ? OR template_text LIKE ? OR temp_id LIKE ? OR temp_name LIKE ?)';
            countSql += ' AND (sender LIKE ? OR template_text LIKE ? OR temp_id LIKE ? OR temp_name LIKE ?)';
            const searchParam = `%${search}%`;
            params.push(searchParam, searchParam, searchParam, searchParam);
            countParams.push(searchParam, searchParam, searchParam, searchParam);
        }

        sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const [templates] = await query(sql, params);
        const [countResult] = await query(countSql, countParams);

        res.json({
            success: true,
            templates,
            pagination: {
                total: countResult[0].total,
                page,
                limit,
                totalPages: Math.ceil(countResult[0].total / limit)
            }
        });
    } catch (error) {
        console.error('Get DLT templates error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch DLT templates' });
    }
});

// GET distinct senders for dropdown
router.get('/senders', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const [senders] = await query(
            'SELECT DISTINCT sender FROM dlt_templates WHERE user_id = ? ORDER BY sender',
            [userId]
        );
        res.json({ success: true, senders: senders.map(s => s.sender) });
    } catch (error) {
        console.error('Get senders error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch senders' });
    }
});

// CREATE single DLT template
router.post('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        let { sender, template_text, temp_id, temp_name, status, temp_type, pe_id, hash_id } = req.body;

        if (!sender || !template_text || !temp_id) {
            return res.status(400).json({ success: false, message: 'Sender, Template Text, and Template ID are required' });
        }

        // Use user defaults if not provided
        if (!pe_id || !hash_id) {
            const [user] = await query('SELECT pe_id, hash_id FROM users WHERE id = ?', [userId]);
            if (user.length > 0) {
                if (!pe_id) pe_id = user[0].pe_id;
                if (!hash_id) hash_id = user[0].hash_id;
            }
        }

        const [result] = await query(
            `INSERT INTO dlt_templates (user_id, sender, template_text, temp_id, temp_name, status, temp_type, pe_id, hash_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [userId, sender, template_text, temp_id, temp_name || '', status || 'Y', temp_type || 'Transactional', pe_id || null, hash_id || null]
        );

        res.status(201).json({
            success: true,
            message: 'DLT Template created successfully',
            id: result.insertId
        });
    } catch (error) {
        console.error('Create DLT template error:', error);
        res.status(500).json({ success: false, message: 'Failed to create DLT template' });
    }
});

// UPDATE DLT template
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        let { sender, template_text, temp_id, temp_name, status, temp_type, pe_id, hash_id } = req.body;

        const [existing] = await query('SELECT id, pe_id, hash_id FROM dlt_templates WHERE id = ? AND user_id = ?', [id, userId]);
        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'Template not found' });
        }

        // Use user defaults if not provided in request AND missing in existing record
        if (!pe_id || !hash_id) {
            const [user] = await query('SELECT pe_id, hash_id FROM users WHERE id = ?', [userId]);
            if (user.length > 0) {
                if (!pe_id && !existing[0].pe_id) pe_id = user[0].pe_id;
                if (!hash_id && !existing[0].hash_id) hash_id = user[0].hash_id;
            }
        }

        await query(
            `UPDATE dlt_templates SET
                sender = COALESCE(?, sender),
                template_text = COALESCE(?, template_text),
                temp_id = COALESCE(?, temp_id),
                temp_name = COALESCE(?, temp_name),
                status = COALESCE(?, status),
                temp_type = COALESCE(?, temp_type),
                pe_id = COALESCE(?, pe_id),
                hash_id = COALESCE(?, hash_id)
             WHERE id = ? AND user_id = ?`,
            [sender, template_text, temp_id, temp_name, status, temp_type, pe_id, hash_id, id, userId]
        );

        res.json({ success: true, message: 'DLT Template updated successfully' });
    } catch (error) {
        console.error('Update DLT template error:', error);
        res.status(500).json({ success: false, message: 'Failed to update DLT template' });
    }
});

// DELETE DLT template
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const [existing] = await query('SELECT id FROM dlt_templates WHERE id = ? AND user_id = ?', [id, userId]);
        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'Template not found' });
        }

        await query('DELETE FROM dlt_templates WHERE id = ? AND user_id = ?', [id, userId]);
        res.json({ success: true, message: 'DLT Template deleted successfully' });
    } catch (error) {
        console.error('Delete DLT template error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete DLT template' });
    }
});

// BULK UPLOAD (XLS/XLSX)
router.post('/bulk-upload', authenticateToken, upload.single('file'), async (req, res) => {
    try {
        const userId = req.user.id;
        const deleteOld = req.body.deleteOld === 'true' || req.body.deleteOld === true;

        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        // Delete old templates if requested
        if (deleteOld) {
            await query('DELETE FROM dlt_templates WHERE user_id = ?', [userId]);
        }

        // Parse Excel file
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(req.file.path);
        const worksheet = workbook.worksheets[0];

        if (!worksheet) {
            return res.status(400).json({ success: false, message: 'No worksheet found in file' });
        }

        const rows = [];
        let headerRow = null;

        worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
            const values = row.values;
            // ExcelJS row.values is 1-indexed, first element is undefined
            const cells = Array.isArray(values) ? values.slice(1) : Object.values(values);

            if (rowNumber === 1) {
                // Try to detect header row
                headerRow = cells.map(c => String(c || '').trim().toUpperCase());
                return;
            }

            // Map columns based on header or positional (User format: SENDER, TEMP_NAME, TEMP_ID, TEMPLATE_TEXT)
            let rowData = {};
            if (headerRow) {
                const senderIdx = headerRow.findIndex(h => h.includes('SENDER') || h.includes('ENTITY') || h.includes('HEADER'));
                const nameIdx = headerRow.findIndex(h => h.includes('TEMP_NAME') || h.includes('TEMPLATE_NAME') || h === 'NAME');
                const idIdx = headerRow.findIndex(h => h.includes('TEMP_ID') || h.includes('TEMPLATE_ID') || h === 'ID');
                const textIdx = headerRow.findIndex(h => h.includes('TEMPLATE') && h.includes('TEXT') || h.includes('CONTENT') || h.includes('MESSAGE'));
                const statusIdx = headerRow.findIndex(h => h.includes('STATUS'));
                const typeIdx = headerRow.findIndex(h => h.includes('TYPE') || h.includes('TEMP_TYPE'));
                const peIdx = headerRow.findIndex(h => h.includes('PE_ID') || h.includes('PRINCIPAL'));
                const hashIdx = headerRow.findIndex(h => h.includes('HASH_ID') || h.includes('HASH'));

                rowData = {
                    sender: String(cells[senderIdx !== -1 ? senderIdx : 0] || '').trim(),
                    temp_name: String(cells[nameIdx !== -1 ? nameIdx : 1] || '').trim(),
                    temp_id: String(cells[idIdx !== -1 ? idIdx : 2] || '').trim(),
                    template_text: String(cells[textIdx !== -1 ? textIdx : 3] || '').trim(),
                    status: String(cells[statusIdx !== -1 ? statusIdx : 4] || 'Y').trim(),
                    temp_type: String(cells[typeIdx !== -1 ? typeIdx : 5] || 'Transactional').trim(),
                    pe_id: peIdx !== -1 && cells[peIdx] ? String(cells[peIdx]).trim() : null,
                    hash_id: hashIdx !== -1 && cells[hashIdx] ? String(cells[hashIdx]).trim() : null,
                };
            } else {
                // Positional mapping matching user image: Sender, Name, ID, Text
                rowData = {
                    sender: String(cells[0] || '').trim(),
                    temp_name: String(cells[1] || '').trim(),
                    temp_id: String(cells[2] || '').trim(),
                    template_text: String(cells[3] || '').trim(),
                    status: String(cells[4] || 'Y').trim(),
                    temp_type: String(cells[5] || 'Transactional').trim(),
                    pe_id: cells[6] ? String(cells[6]).trim() : null,
                    hash_id: cells[7] ? String(cells[7]).trim() : null,
                };
            }

            if (rowData.sender && rowData.template_text && rowData.temp_id) {
                rows.push(rowData);
            }
        });

        if (rows.length === 0) {
            // Cleanup uploaded file
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ success: false, message: 'No valid data rows found in file' });
        }

        // Fetch user defaults for bulk upload fallback
        const [user] = await query('SELECT pe_id, hash_id FROM users WHERE id = ?', [userId]);
        const userPeId = user.length > 0 ? user[0].pe_id : null;
        const userHashId = user.length > 0 ? user[0].hash_id : null;

        // Map fallbacks to rows
        rows.forEach(r => {
            if (!r.pe_id) r.pe_id = userPeId;
            if (!r.hash_id) r.hash_id = userHashId;
        });

        // Batch insert
        const BATCH_SIZE = 500;
        let inserted = 0;
        for (let i = 0; i < rows.length; i += BATCH_SIZE) {
            const batch = rows.slice(i, i + BATCH_SIZE);
            const values = batch.map(r => [userId, r.sender, r.template_text, r.temp_id, r.temp_name, r.status, r.temp_type, r.pe_id, r.hash_id]);
            const placeholders = batch.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
            const flatValues = values.flat();

            await query(
                `INSERT INTO dlt_templates (user_id, sender, template_text, temp_id, temp_name, status, temp_type, pe_id, hash_id)
                 VALUES ${placeholders}
                 ON DUPLICATE KEY UPDATE 
                    template_text = VALUES(template_text),
                    temp_name = VALUES(temp_name),
                    sender = VALUES(sender),
                    status = VALUES(status),
                    temp_type = VALUES(temp_type),
                    pe_id = VALUES(pe_id),
                    hash_id = VALUES(hash_id)`,
                flatValues
            );
            inserted += batch.length;
        }

        // Cleanup uploaded file
        fs.unlinkSync(req.file.path);

        res.json({
            success: true,
            message: `Successfully uploaded ${inserted} DLT templates`,
            count: inserted
        });
    } catch (error) {
        console.error('Bulk upload DLT templates error:', error);
        // Cleanup file on error
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ success: false, message: 'Failed to process uploaded file', error: error.message });
    }
});

module.exports = router;
