require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');

async function listAllTables() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME
        });

        const [tables] = await connection.execute('SHOW TABLES');
        const tableNames = tables.map(row => Object.values(row)[0]);
        console.log('Tables in database:', tableNames);
        
        let output = '';
        for (const table of tableNames) {
            output += `--- Schema for table: ${table} ---\n`;
            try {
                const [columns] = await connection.execute(`DESCRIBE ${table}`);
                columns.forEach(col => {
                    output += `${col.Field} | ${col.Type} | ${col.Null} | ${col.Key} | ${col.Default} | ${col.Extra}\n`;
                });
            } catch (e) {
                output += `Error describing table ${table}: ${e.message}\n`;
            }
            output += '\n';
        }
        fs.writeFileSync('full_schema_dump.txt', output);
        console.log('Full schema dumped to full_schema_dump.txt');

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        if (connection) await connection.end();
    }
}

listAllTables();
