const { query } = require('../config/db');

async function migrateVoiceGateways() {
    console.log("🚀 Starting Voice Gateway Migration...");

    try {
        // Add provider column
        console.log("🛠️ Adding provider column to voice_configs...");
        await query(`ALTER TABLE voice_configs ADD COLUMN IF NOT EXISTS provider ENUM('cell24x7', 'edpl') DEFAULT 'cell24x7'`);
        
        // Add base_url column
        console.log("🛠️ Adding base_url column to voice_configs...");
        await query(`ALTER TABLE voice_configs ADD COLUMN IF NOT EXISTS base_url VARCHAR(255) DEFAULT NULL`);
        
        // Add api_key column for future integrations
        console.log("🛠️ Adding api_key column to voice_configs...");
        await query(`ALTER TABLE voice_configs ADD COLUMN IF NOT EXISTS api_key VARCHAR(255) DEFAULT NULL`);

        console.log("✅ Voice Gateway Migration Completed Successfully!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Migration Failed:", error.message);
        process.exit(1);
    }
}

migrateVoiceGateways();
