require('dotenv').config();
const { query } = require('./config/db');

async function migrate() {
    try {
        console.log("🚀 Starting Migration: Adding 'variables' column to 'campaign_queue'...");

        // 1. Check if column exists
        const [columns] = await query("DESCRIBE campaign_queue");
        const hasVariables = columns.find(c => c.Field === 'variables');

        if (hasVariables) {
            console.log("✅ Column 'variables' already exists. Skipping.");
        } else {
            // 2. Add column
            await query("ALTER TABLE campaign_queue ADD COLUMN variables JSON DEFAULT NULL AFTER mobile");
            console.log("✅ Column 'variables' (JSON) added successfully.");
        }

        process.exit(0);
    } catch (err) {
        console.error("❌ Migration Failed:", err.message);
        process.exit(1);
    }
}

migrate();
