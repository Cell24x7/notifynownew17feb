const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../backend/.env') });
const mysql = require('mysql2/promise');

async function checkSchema() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME
        });

        console.log('✅ Connected to database');

        const [tables] = await connection.execute('SHOW TABLES');
        console.log('Tables:', tables.map(t => Object.values(t)[0]));

        if (tables.some(t => Object.values(t)[0] === 'message_templates')) {
            const [columns] = await connection.execute('SHOW COLUMNS FROM message_templates');
            console.log('\n--- message_templates columns ---');
            console.table(columns.map(c => ({ Field: c.Field, Type: c.Type, Null: c.Null, Key: c.Key, Default: c.Default })));
        } else {
            console.log('❌ message_templates table does not exist');
        }

        if (tables.some(t => Object.values(t)[0] === 'template_buttons')) {
            const [columns] = await connection.execute('SHOW COLUMNS FROM template_buttons');
            console.log('\n--- template_buttons columns ---');
            console.table(columns.map(c => ({ Field: c.Field, Type: c.Type, Null: c.Null, Key: c.Key, Default: c.Default })));
        } else {
            console.log('❌ template_buttons table does not exist');
        }

        await connection.end();
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

checkSchema();
