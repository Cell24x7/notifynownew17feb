const path = require('path');
const dotenv = require('dotenv');
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
dotenv.config({ path: path.join(__dirname, '..', envFile) });

const { query } = require('../config/db');

async function fixApiCampaignCols() {
    console.log('--- Starting API Campaigns Schema Fix ---');
    try {
        const columns = [
            'rcs_config_id VARCHAR(50)',
            'whatsapp_config_id VARCHAR(50)',
            'ai_voice_config_id VARCHAR(50)',
            'pe_id VARCHAR(100)',
            'hash_id VARCHAR(100)',
            'sender VARCHAR(100)'
        ];
        
        for (const col of columns) {
            try {
                process.stdout.write(`Adding ${col} to api_campaigns... `);
                await query(`ALTER TABLE api_campaigns ADD COLUMN IF NOT EXISTS ${col} DEFAULT NULL`);
                console.log('✅ Done');
            } catch (err) {
                console.log(`⚠️ Failed or existing: ${err.message}`);
            }
        }
        
    } catch (err) {
        console.error('❌ Critical Error:', err.message);
    }
    process.exit();
}

fixApiCampaignCols();
