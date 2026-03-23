const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function migrate() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME
    });

    try {
        console.log('Starting migration for campaigns table...');

        const [existingCols] = await connection.query('DESCRIBE campaigns');
        const colNames = existingCols.map(c => c.Field);

        const newCols = [
            { name: 'schedule_type', query: "ALTER TABLE campaigns ADD COLUMN schedule_type ENUM('now', 'scheduled') DEFAULT 'now'" },
            { name: 'scheduling_mode', query: "ALTER TABLE campaigns ADD COLUMN scheduling_mode ENUM('one-time', 'repeat') DEFAULT 'one-time'" },
            { name: 'frequency', query: "ALTER TABLE campaigns ADD COLUMN frequency ENUM('daily', 'weekly', 'monthly') NULL" },
            { name: 'repeat_days', query: "ALTER TABLE campaigns ADD COLUMN repeat_days JSON NULL" },
            { name: 'end_date', query: "ALTER TABLE campaigns ADD COLUMN end_date DATETIME NULL" },
            { name: 'next_run_at', query: "ALTER TABLE campaigns ADD COLUMN next_run_at DATETIME NULL" },
            { name: 'last_run_at', query: "ALTER TABLE campaigns ADD COLUMN last_run_at DATETIME NULL" }
        ];

        for (const col of newCols) {
            if (colNames.includes(col.name)) {
                console.log(`Column ${col.name} already exists, skipping...`);
            } else {
                console.log(`Adding column ${col.name}...`);
                await connection.query(col.query);
            }
        }

        console.log('Migration completed successfully!');
    } catch (err) {
        console.error('Migration failed:', err.message);
    } finally {
        await connection.end();
    }
}

migrate();
