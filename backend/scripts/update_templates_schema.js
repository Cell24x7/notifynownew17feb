require('dotenv').config();
const mysql = require('mysql2/promise');

async function updateTemplatesSchema() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME
        });

        console.log('--- Updating message_templates schema ---');

        const [cols] = await connection.execute('DESCRIBE message_templates');

        const hasWAConfigId = cols.some(col => col.Field === 'whatsapp_config_id');
        if (!hasWAConfigId) {
            console.log('Adding whatsapp_config_id to message_templates...');
            await connection.execute('ALTER TABLE message_templates ADD COLUMN whatsapp_config_id INT AFTER user_id');
        }

        const hasRCSConfigId = cols.some(col => col.Field === 'rcs_config_id');
        if (!hasRCSConfigId) {
            console.log('Adding rcs_config_id to message_templates...');
            await connection.execute('ALTER TABLE message_templates ADD COLUMN rcs_config_id INT AFTER whatsapp_config_id');
        }

        // Backfill existing templates with user's current config if they are null
        console.log('Backfilling existing templates with current user config...');
        await connection.execute(`
            UPDATE message_templates mt
            JOIN users u ON mt.user_id = u.id
            SET mt.whatsapp_config_id = u.whatsapp_config_id
            WHERE mt.channel = 'whatsapp' AND mt.whatsapp_config_id IS NULL
        `);

        await connection.execute(`
            UPDATE message_templates mt
            JOIN users u ON mt.user_id = u.id
            SET mt.rcs_config_id = u.rcs_config_id
            WHERE mt.channel = 'rcs' AND mt.rcs_config_id IS NULL
        `);

        console.log('Schema update completed successfully.');

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        if (connection) await connection.end();
    }
}

updateTemplatesSchema();
