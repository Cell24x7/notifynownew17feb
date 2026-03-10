const { query } = require('./backend/config/db');
require('dotenv').config({ path: './backend/.env' });

async function check() {
    try {
        console.log('Using DB_NAME:', process.env.DB_NAME);
        const [dbs] = await query('SHOW DATABASES');
        console.log('Databases:', dbs.map(d => d.Database));

        const [tables] = await query(`SHOW TABLES IN ${process.env.DB_NAME}`);
        console.log('Tables in', process.env.DB_NAME, ':', tables.map(t => Object.values(t)[0]));

        const [columns] = await query(`DESCRIBE ${process.env.DB_NAME}.webhook_logs`);
        console.table(columns);

        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

check();
