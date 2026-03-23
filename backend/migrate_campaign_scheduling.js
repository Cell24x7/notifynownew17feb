const path = require('path');
const dotenv = require('dotenv');

// Smart env loading: prioritizes .env.production on servers
const currentPath = __dirname;
let envFile = '.env';
if (currentPath.includes('notifynow.in') || process.env.NODE_ENV === 'production') {
    envFile = '.env.production';
}
dotenv.config({ path: path.join(__dirname, envFile) });

const { query } = require('./config/db');

async function migrate() {
    try {
        const tables = ['campaigns', 'api_campaigns'];
        
        for (const table of tables) {
            console.log(`🚀 Starting migration for ${table} table [${process.env.DB_NAME}]...`);

            const [existingCols] = await query(`DESCRIBE ${table}`);
            const colNames = existingCols.map(c => c.Field);

            const newCols = [
                { name: 'schedule_type', query: `ALTER TABLE ${table} ADD COLUMN schedule_type ENUM('now', 'scheduled') DEFAULT 'now'` },
                { name: 'scheduling_mode', query: `ALTER TABLE ${table} ADD COLUMN scheduling_mode ENUM('one-time', 'repeat') DEFAULT 'one-time'` },
                { name: 'frequency', query: `ALTER TABLE ${table} ADD COLUMN frequency ENUM('daily', 'weekly', 'monthly') NULL` },
                { name: 'repeat_days', query: `ALTER TABLE ${table} ADD COLUMN repeat_days JSON NULL` },
                { name: 'end_date', query: `ALTER TABLE ${table} ADD COLUMN end_date DATETIME NULL` },
                { name: 'next_run_at', query: `ALTER TABLE ${table} ADD COLUMN next_run_at DATETIME NULL` },
                { name: 'last_run_at', query: `ALTER TABLE ${table} ADD COLUMN last_run_at DATETIME NULL` }
            ];

            for (const col of newCols) {
                if (colNames.includes(col.name)) {
                    console.log(`✅ Table ${table}: Column ${col.name} already exists, skipping...`);
                } else {
                    console.log(`➕ Table ${table}: Adding column ${col.name}...`);
                    await query(col.query);
                }
            }
        }

        console.log('✨ Migration completed successfully!');
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
    } finally {
        process.exit(0);
    }
}

migrate();
