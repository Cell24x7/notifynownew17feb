require('dotenv').config();
const mysql = require('mysql2/promise');

async function fix() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || process.env.DB_PASS || '',
        database: process.env.DB_NAME || 'notifynow_db',
    });

    try {
        console.log('Checking message_logs schema...');
        const [cols] = await connection.query('SHOW COLUMNS FROM message_logs');
        const colNames = cols.map(c => c.Field);

        if (!colNames.includes('channel')) {
            console.log('Adding channel column...');
            await connection.query('ALTER TABLE message_logs ADD COLUMN channel VARCHAR(50) DEFAULT "rcs" AFTER status');
        }
        
        if (!colNames.includes('message_id')) {
            console.log('Adding message_id column...');
            await connection.query('ALTER TABLE message_logs ADD COLUMN message_id VARCHAR(255) AFTER id');
            await connection.query('CREATE INDEX idx_msg_id ON message_logs(message_id)');
        } else {
            // Ensure index exists even if column was already there
            try {
                await connection.query('CREATE INDEX idx_msg_id ON message_logs(message_id)');
                console.log('Created index idx_msg_id on message_logs');
            } catch (e) {
                if (!e.message.includes('Duplicate key name')) console.error('Index error:', e.message);
            }
        }

        // Also for api_message_logs
        try {
            await connection.query('CREATE INDEX idx_api_msg_id ON api_message_logs(message_id)');
        } catch (e) {}

        try {
            await connection.query('CREATE INDEX idx_camp_id ON message_logs(campaign_id)');
            console.log('Created index idx_camp_id on message_logs');
        } catch (e) {}
        
        try {
            await connection.query('CREATE INDEX idx_api_camp_id ON api_message_logs(campaign_id)');
            console.log('Created index idx_api_camp_id on api_message_logs');
        } catch (e) {}

        if (!colNames.includes('failure_reason')) {
            console.log('Adding failure_reason column...');
            await connection.query('ALTER TABLE message_logs ADD COLUMN failure_reason TEXT AFTER status');
        }

        if (!colNames.includes('delivery_time')) {
            console.log('Adding delivery_time column...');
            await connection.query('ALTER TABLE message_logs ADD COLUMN delivery_time TIMESTAMP NULL AFTER created_at');
        }

        // --- ENSURE COLUMNS ARE WIDE ENOUGH ---
        console.log('Ensuring column lengths are sufficient...');
        await connection.query('ALTER TABLE message_logs MODIFY COLUMN recipient VARCHAR(50)');
        await connection.query('ALTER TABLE api_message_logs MODIFY COLUMN recipient VARCHAR(50)');
        await connection.query('ALTER TABLE message_logs MODIFY COLUMN message_id VARCHAR(255)');
        await connection.query('ALTER TABLE api_message_logs MODIFY COLUMN message_id VARCHAR(255)');
        
        // Ensure failure_reason is TEXT in both
        const [apiCols] = await connection.query('SHOW COLUMNS FROM api_message_logs');
        if (!apiCols.map(c => c.Field).includes('failure_reason')) {
            await connection.query('ALTER TABLE api_message_logs ADD COLUMN failure_reason TEXT AFTER status');
        }

        // Check campaign_queue for channel column
        const [qCols] = await connection.query('SHOW COLUMNS FROM campaign_queue');
        if (!qCols.map(c => c.Field).includes('channel')) {
            console.log('Adding channel column to campaign_queue...');
            await connection.query('ALTER TABLE campaign_queue ADD COLUMN channel VARCHAR(50) DEFAULT NULL AFTER status');
        }

        console.log('✅ Schema updated successfully!');
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
    } finally {
        await connection.end();
        process.exit(0);
    }
}

fix();
