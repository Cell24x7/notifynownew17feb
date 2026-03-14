const path = require('path');
const dotenv = require('dotenv');
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
dotenv.config({ path: path.join(__dirname, envFile) });
console.log(`📡 Migration Environment: ${process.env.NODE_ENV || 'development'} (using ${envFile})`);

const mysql = require('mysql2/promise');

async function updateSchema() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME
        });

        console.log('--- Adding WhatsApp Pricing Columns ---');

        const [userCols] = await connection.execute('DESCRIBE users');
        
        const priceCols = [
            { name: 'wa_marketing_price', type: 'DECIMAL(10,2)', default: '0.80' },
            { name: 'wa_utility_price', type: 'DECIMAL(10,2)', default: '0.40' },
            { name: 'wa_authentication_price', type: 'DECIMAL(10,2)', default: '0.30' }
        ];

        for (const col of priceCols) {
            const exists = userCols.some(c => c.Field === col.name);
            if (!exists) {
                console.log(`Adding ${col.name} to users table...`);
                await connection.execute(`ALTER TABLE users ADD COLUMN ${col.name} ${col.type} DEFAULT ${col.default} AFTER rcs_carousel_price`);
            } else {
                console.log(`${col.name} already exists in users table.`);
            }
        }

        console.log('Migration completed successfully.');

    } catch (err) {
        console.error('Migration Error:', err.message);
    } finally {
        if (connection) await connection.end();
    }
}

updateSchema();
