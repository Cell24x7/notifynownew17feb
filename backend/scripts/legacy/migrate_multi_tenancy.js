require('dotenv').config();
const mysql = require('mysql2/promise');

async function run() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME
        });

        console.log('🚀 Starting Schema Migration for Multi-Tenancy...');

        const tablesToUpdate = [
            { table: 'message_logs', after: 'id' },
            { table: 'campaign_queue', after: 'campaign_id' },
            { table: 'webhook_logs', after: 'id' },
            { table: 'rcs_configs', after: 'id' },
            { table: 'affiliates', after: 'id' }
        ];

        for (const item of tablesToUpdate) {
            try {
                console.log(`🛠️ Updating table: ${item.table}...`);
                await connection.execute(`ALTER TABLE ${item.table} ADD COLUMN user_id INT NULL AFTER ${item.after}`);
                console.log(`✅ Table ${item.table} updated.`);
            } catch (e) {
                if (e.code === 'ER_DUP_COLUMN_NAME') {
                    console.log(`ℹ️ Column user_id already exists in ${item.table}.`);
                } else {
                    console.error(`❌ Error updating ${item.table}: ${e.message}`);
                }
            }
        }

        // Backfill user_id where possible (e.g., from campaigns)
        console.log('🔄 Backfilling user_id in message_logs from campaigns table...');
        await connection.execute(`
            UPDATE message_logs ml
            JOIN campaigns c ON ml.campaign_id = c.id
            SET ml.user_id = c.user_id
            WHERE ml.user_id IS NULL
        `);
        console.log('✅ Backfill complete.');

        console.log('🏁 Migration finished successfully.');

    } catch (err) {
        console.error('❌ Migration failed:', err.message);
    } finally {
        if (connection) await connection.end();
    }
}

run();
