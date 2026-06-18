const mysql = require('mysql2/promise');
require('dotenv').config({ path: __dirname + '/../.env' });

async function archiveOldLogs() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASS || process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'notifynow_db',
    });

    try {
        console.log('--- Starting Old Logs Archival Process ---');
        const DAYS_TO_KEEP = 90;

        // 1. Archive message_logs
        console.log(`Archiving message_logs older than ${DAYS_TO_KEEP} days...`);
        const [archiveRes] = await connection.query(`
            INSERT IGNORE INTO message_logs_archive
            SELECT * FROM message_logs 
            WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)
        `, [DAYS_TO_KEEP]);
        console.log(`✅ Archived ${archiveRes.affectedRows} rows from message_logs.`);

        if (archiveRes.affectedRows > 0) {
            const [delRes] = await connection.query(`
                DELETE FROM message_logs 
                WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)
            `, [DAYS_TO_KEEP]);
            console.log(`🧹 Deleted ${delRes.affectedRows} rows from message_logs.`);
        }

        // 2. Archive api_message_logs
        console.log(`Archiving api_message_logs older than ${DAYS_TO_KEEP} days...`);
        const [apiArchiveRes] = await connection.query(`
            INSERT IGNORE INTO api_message_logs_archive
            SELECT * FROM api_message_logs 
            WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)
        `, [DAYS_TO_KEEP]);
        console.log(`✅ Archived ${apiArchiveRes.affectedRows} rows from api_message_logs.`);

        if (apiArchiveRes.affectedRows > 0) {
            const [apiDelRes] = await connection.query(`
                DELETE FROM api_message_logs 
                WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)
            `, [DAYS_TO_KEEP]);
            console.log(`🧹 Deleted ${apiDelRes.affectedRows} rows from api_message_logs.`);
        }

        console.log('--- Archival Complete ---');
    } catch (err) {
        console.error('Archival Error:', err);
    } finally {
        await connection.end();
    }
}

archiveOldLogs();
