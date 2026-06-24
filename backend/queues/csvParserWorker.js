const { Worker } = require('bullmq');
const { query } = require('../config/db');
const { redisConnection } = require('./csvParserQueue');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const ExcelJS = require('exceljs');

const envSuffix = (process.env.APP_NAME || 'notifynow').replace(/-developer|-production/g, '');
const queueName = `csv-parser-${envSuffix}`;

const csvParserWorker = new Worker(queueName, async (job) => {
    const { filePath, originalName, campaignId, userId, channel } = job.data;
    console.log(`[CsvParserWorker] Starting to parse file ${originalName} for campaign ${campaignId}`);

    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }

    try {
        let contactCount = 0;
        const BATCH_SIZE = 1000;
        let batch = [];

        const processBatch = async (currentBatch) => {
            if (currentBatch.length === 0) return;
            const values = currentBatch.map(item => [campaignId, userId, item.mobile, JSON.stringify(item.variables), 'pending', channel]);
            await query('INSERT INTO campaign_queue (campaign_id, user_id, mobile, variables, status, channel) VALUES ?', [values]);
        };

        const ext = path.extname(originalName).toLowerCase();
        
        if (ext === '.xlsx' || ext === '.xls') {
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.readFile(filePath);
            const worksheet = workbook.getWorksheet(1);
            const headers = [];

            worksheet.getRow(1).eachCell((cell, colNumber) => {
                const val = String(cell.value || '').trim();
                if (val) headers[colNumber] = val;
            });

            const totalRows = worksheet.rowCount;
            for (let i = 2; i <= totalRows; i++) {
                const row = worksheet.getRow(i);
                const rowData = {};
                let mobile = null;

                row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
                    const header = headers[colNumber];
                    if (header) {
                        rowData[header] = cell.value;
                        const lowerH = header.toLowerCase().replace(/\s/g, '').replace(/_/g, '');
                        const commonKeys = ['phone', 'mobile', 'number', 'recipient', 'contact', 'destination'];
                        if (commonKeys.includes(lowerH)) {
                            const m = String(cell.value || '').replace(/\D/g, '');
                            if (m.length >= 10) mobile = m;
                        }
                    }
                });

                if (!mobile) {
                   const first = String(row.getCell(1).value || '').replace(/\D/g, '');
                   if (first.length >= 10) mobile = first;
                }

                if (mobile) {
                    batch.push({ mobile, variables: rowData });
                    contactCount++;
                    if (batch.length >= BATCH_SIZE) {
                        await processBatch(batch);
                        batch = [];
                    }
                }
            }
        } else {
            // Sequential CSV Processing (Stream-based)
            await new Promise((resolve, reject) => {
                const stream = fs.createReadStream(filePath).pipe(csv());
                
                stream.on('data', async (row) => {
                    let mobile = null;
                    const commonKeys = ['phone', 'mobile', 'number', 'recipient', 'contact', 'destination'];
                    const rowData = row;
                    
                    const keys = Object.keys(row);
                    for (const k of keys) {
                        const lowK = k.toLowerCase().replace(/\s/g, '').replace(/_/g, '');
                        if (commonKeys.includes(lowK)) {
                            const m = String(row[k] || '').replace(/\D/g, '');
                            if (m.length >= 10) { mobile = m; break; }
                        }
                    }

                    if (!mobile) {
                        const first = String(Object.values(row)[0] || '').replace(/\D/g, '');
                        if (first.length >= 10) mobile = first;
                    }

                    if (mobile) {
                        batch.push({ mobile, variables: rowData });
                        contactCount++;
                        if (batch.length >= BATCH_SIZE) {
                            // Pause stream while inserting to prevent memory overload
                            stream.pause();
                            await processBatch(batch).catch(reject);
                            batch = [];
                            stream.resume();
                        }
                    }
                });

                stream.on('end', () => resolve());
                stream.on('error', reject);
            });
        }

        // Insert remaining batch
        if (batch.length > 0) {
            await processBatch(batch);
        }

        // Cleanup file
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        // Update campaign contact count
        await query('UPDATE campaigns SET recipient_count = COALESCE(recipient_count, 0) + ? WHERE id = ?', [contactCount, campaignId]);
        
        console.log(`[CsvParserWorker] Completed parsing ${contactCount} contacts for campaign ${campaignId}`);

        // Trigger Queue to start sending if applicable
        const { processQueue } = require('../services/queueService');
        processQueue().catch(e => console.error('Auto-trigger queue failed in worker:', e.message));

        return { contactCount };

    } catch (error) {
        console.error(`[CsvParserWorker] Error processing file for campaign ${campaignId}:`, error);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath); // Ensure cleanup on error
        }
        throw error;
    }
}, {
    connection: redisConnection,
    concurrency: 2 // Can parse 2 huge CSVs concurrently
});

csvParserWorker.on('completed', job => {
    // console.log(`[CsvParserWorker] Job ${job.id} has completed!`);
});

csvParserWorker.on('failed', (job, err) => {
    console.error(`[CsvParserWorker] Job ${job ? job.id : 'unknown'} has failed with ${err.message}`);
});

module.exports = csvParserWorker;
