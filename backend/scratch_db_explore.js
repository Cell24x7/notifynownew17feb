const mysql = require('mysql2/promise');

async function explore() {
    try {
        console.log('Connecting to MySQL...');
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'waQ4!r1241Kr'
        });

        console.log('Connected! Listing databases:');
        const [dbs] = await connection.query('SHOW DATABASES');
        console.log(dbs.map(d => d.Database));

        // Find the database name (e.g. unofficial_whatsapp_db or similar)
        const dbName = dbs.map(d => d.Database).find(name => name.includes('whatsapp') || name.includes('proero'));
        if (!dbName) {
            console.log('No WhatsApp-specific database found in MySQL.');
            await connection.end();
            return;
        }

        console.log(`Using database: ${dbName}`);
        await connection.query(`USE \`${dbName}\``);

        console.log('Listing tables:');
        const [tables] = await connection.query('SHOW TABLES');
        const tableNames = tables.map(t => Object.values(t)[0]);
        console.log(tableNames);

        for (const tableName of tableNames) {
            console.log(`\n--- Structure of table: ${tableName} ---`);
            const [desc] = await connection.query(`DESCRIBE \`${tableName}\``);
            console.log(desc.map(d => `${d.Field} (${d.Type}) - Null: ${d.Null}, Key: ${d.Key}, Default: ${d.Default}`));
            
            console.log(`--- Sample rows (max 3) from: ${tableName} ---`);
            const [rows] = await connection.query(`SELECT * FROM \`${tableName}\` LIMIT 3`);
            console.log(rows);
        }

        await connection.end();
    } catch (err) {
        console.error('Error during database exploration:', err.message);
    }
}

explore();
