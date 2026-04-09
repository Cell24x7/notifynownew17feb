const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

async function fixCampaignSchema() {
    // Load env
    const envPath = fs.existsSync(path.join(__dirname, '../.env.production')) 
                    ? path.join(__dirname, '../.env.production') 
                    : path.join(__dirname, '../.env');
    dotenv.config({ path: envPath });

    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
    });

    try {
        console.log(`📡 Using: ${envPath}`);
        console.log('🔄 Repairing Campaign tables...');

        const tables = ['campaigns', 'api_campaigns'];
        const cols = [
            { name: 'rcs_config_id', type: 'INT DEFAULT NULL' },
            { name: 'whatsapp_config_id', type: 'INT DEFAULT NULL' }
        ];

        for (const table of tables) {
            const [existingCols] = await connection.query(`DESCRIBE ${table}`);
            const colNames = existingCols.map(c => c.Field);

            for (const col of cols) {
                if (!colNames.includes(col.name)) {
                    console.log(`  ➕ Adding ${col.name} to ${table}...`);
                    await connection.query(`ALTER TABLE ${table} ADD COLUMN ${col.name} ${col.type}`);
                }
            }
        }

        console.log('✅ Success! Campaigns tables are now compatible with the new engine.');
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await connection.end();
    }
}

fixCampaignSchema();
