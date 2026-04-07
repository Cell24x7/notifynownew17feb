const path = require('path');
const dotenv = require('dotenv');

// Smart env loading: Try .env.production first, then fallback to .env
const envProduction = path.join(__dirname, '../.env.production');
const envDev = path.join(__dirname, '../.env');

if (require('fs').existsSync(envProduction)) {
    dotenv.config({ path: envProduction });
    process.env.NODE_ENV = 'production';
} else {
    dotenv.config({ path: envDev });
}

console.log(`📡 Migration Environment: ${process.env.NODE_ENV || 'development'}`);

const mysql = require('mysql2/promise');

async function updatePricingPrecision() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME
        });

        console.log('--- Updating Pricing Precision to 4 Decimal Places ---');

        // Columns to update in 'users' table
        const userPriceCols = [
            'rcs_text_price', 'rcs_rich_card_price', 'rcs_carousel_price',
            'wa_marketing_price', 'wa_utility_price', 'wa_authentication_price',
            'sms_promotional_price', 'sms_transactional_price', 'sms_service_price',
            'wallet_balance', 'credits_available', 'credits_used'
        ];

        for (const col of userPriceCols) {
            console.log(`Updating users.${col} to DECIMAL(15,4)...`);
            try {
                await connection.execute(`ALTER TABLE users MODIFY COLUMN ${col} DECIMAL(15,4) DEFAULT 0.0000`);
            } catch (err) {
                console.warn(`  ⚠️ Could not update ${col}:`, err.message);
            }
        }

        // Columns to update in 'plans' table
        try {
            console.log('Updating plans.price to DECIMAL(15,4)...');
            await connection.execute(`ALTER TABLE plans MODIFY COLUMN price DECIMAL(15,4) DEFAULT 0.0000`);
        } catch (err) {
            console.warn('  ⚠️ Could not update plans.price:', err.message);
        }

        // Columns to update in 'transactions' table
        try {
            console.log('Updating transactions amount/credits to DECIMAL(15,4)...');
            await connection.execute(`ALTER TABLE transactions MODIFY COLUMN amount DECIMAL(15,4) DEFAULT 0.0000`);
            await connection.execute(`ALTER TABLE transactions MODIFY COLUMN credits DECIMAL(15,4) DEFAULT 0.0000`);
        } catch (err) {
            console.warn('  ⚠️ Could not update transactions columns:', err.message);
        }

        console.log('✅ Pricing precision updated successfully.');

    } catch (err) {
        console.error('❌ Migration Error:', err.message);
    } finally {
        if (connection) await connection.end();
        process.exit(0);
    }
}

updatePricingPrecision();
