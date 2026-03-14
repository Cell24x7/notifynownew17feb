const path = require('path');
const dotenv = require('dotenv');

// Smart env loading: production uses .env.production, dev uses .env
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
dotenv.config({ path: path.join(__dirname, envFile) });

console.log(`📡 Migration Environment: ${process.env.NODE_ENV || 'development'} (using ${envFile})`);

const mysql = require('mysql2/promise');

async function run() {
    try {
        console.log('DB Config:', {
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            database: process.env.DB_NAME,
            hasPassword: !!process.env.DB_PASS
        });

        console.log('Connecting to DB...');
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || '127.0.0.1',
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME
        });

        console.log('Checking users table schema...');
        const [cols] = await connection.execute('DESCRIBE users');
        const existingCols = cols.map(c => c.Field);
        
        if (!existingCols.includes('wa_marketing_price')) {
            console.log('Adding wa_marketing_price...');
            await connection.execute('ALTER TABLE users ADD COLUMN wa_marketing_price DECIMAL(10,2) DEFAULT 0.80 AFTER rcs_carousel_price');
        } else {
            console.log('wa_marketing_price already exists.');
        }

        if (!existingCols.includes('wa_utility_price')) {
            console.log('Adding wa_utility_price...');
            await connection.execute('ALTER TABLE users ADD COLUMN wa_utility_price DECIMAL(10,2) DEFAULT 0.40 AFTER wa_marketing_price');
        } else {
            console.log('wa_utility_price already exists.');
        }

        if (!existingCols.includes('wa_authentication_price')) {
            console.log('Adding wa_authentication_price...');
            await connection.execute('ALTER TABLE users ADD COLUMN wa_authentication_price DECIMAL(10,2) DEFAULT 0.30 AFTER wa_utility_price');
        } else {
            console.log('wa_authentication_price already exists.');
        }

        console.log('Migration finished successfully.');
        await connection.end();
        process.exit(0);
    } catch (e) {
        console.error('Migration failed:', e.message);
        process.exit(1);
    }
}

run();
