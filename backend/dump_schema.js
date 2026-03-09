require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');

async function dumpSchema() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME
        });

        const tables = ['users', 'resellers', 'whatsapp_configs'];
        let output = '';

        for (const table of tables) {
            output += `--- Schema for table: ${table} ---\n`;
            const [columns] = await connection.execute(`DESCRIBE ${table}`);
            columns.forEach(col => {
                output += `${col.Field} | ${col.Type} | ${col.Null} | ${col.Key} | ${col.Default} | ${col.Extra}\n`;
            });
            output += '\n';
        }

        fs.writeFileSync('readable_schema.txt', output);
        console.log('Schema dumped to readable_schema.txt');

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        if (connection) await connection.end();
    }
}

dumpSchema();
