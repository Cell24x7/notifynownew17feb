const mysql = require('mysql2/promise');
const path = require('path');
const dotenv = require('dotenv');

const fixWebhookLogsTable = async () => {
    let connection;
    try {
        const envPath = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
        dotenv.config({ path: path.join(__dirname, '..', envPath) });
        
        console.log(`🌍 MODE: ${process.env.NODE_ENV || 'development'} (using ${envPath})`);
        
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER,
            password: process.env.DB_PASS || process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
        });

        console.log('🔄 Fixing webhook_logs table structure...');
        const [columns] = await connection.query('SHOW COLUMNS FROM webhook_logs');
        const colNames = columns.map(c => c.Field);

        const neededCols = [
            { name: 'user_id', type: 'INT' },
            { name: 'sender', type: 'VARCHAR(100)' },
            { name: 'recipient', type: 'VARCHAR(50)' },
            { name: 'message_id', type: 'VARCHAR(100)' },
            { name: 'message_content', type: 'TEXT' },
            { name: 'channel', type: 'VARCHAR(50)' },
            { name: 'campaign_id', type: 'VARCHAR(100)' },
            { name: 'campaign_name', type: 'VARCHAR(100)' },
            { name: 'template_name', type: 'VARCHAR(100)' }
        ];

        for (const col of neededCols) {
            if (!colNames.includes(col.name)) {
                console.log(`Adding column ${col.name}...`);
                await connection.query(`ALTER TABLE webhook_logs ADD COLUMN ${col.name} ${col.type}`);
            }
        }

        console.log('✅ webhook_logs table updated with missing columns.');

    } catch (error) {
        console.error('❌ Error updating table:', error.message);
    } finally {
        if (connection) await connection.end();
    }
};

fixWebhookLogsTable();
