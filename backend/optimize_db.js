require('dotenv').config();
const { query } = require('./config/db');

async function optimize() {
    try {
        console.log("🚀 Starting database optimization...");

        // 1. WEBHOOK_LOGS Indexes (Crucial for Chat UI)
        console.log("Adding indexes to webhook_logs...");
        try {
            await query("ALTER TABLE webhook_logs ADD INDEX idx_user_id (user_id)");
            await query("ALTER TABLE webhook_logs ADD INDEX idx_created_at (created_at DESC)");
            await query("ALTER TABLE webhook_logs ADD INDEX idx_phones (sender, recipient)");
        } catch (e) {
            console.warn("⚠️ Webhook logs indexes warning (likely already exists):", e.message);
        }

        // 2. MESSAGE_LOGS Indexes (Crucial for Reports)
        console.log("Adding indexes to message_logs...");
        try {
            await query("ALTER TABLE message_logs ADD INDEX idx_user_id (user_id)");
            await query("ALTER TABLE message_logs ADD INDEX idx_created_at (created_at DESC)");
        } catch (e) {
            console.warn("⚠️ Message logs indexes warning:", e.message);
        }

        // 3. CONTACTS Indexes (Crucial for Chat search/linking)
        console.log("Adding indexes to contacts...");
        try {
            await query("ALTER TABLE contacts ADD INDEX idx_user_id (user_id)");
            await query("ALTER TABLE contacts ADD INDEX idx_phone (phone)");
        } catch (e) {
            console.warn("⚠️ Contacts indexes warning:", e.message);
        }

        console.log("✅ Database optimization complete.");
        process.exit(0);
    } catch (err) {
        console.error("❌ Fatal optimization error:", err.message);
        process.exit(1);
    }
}

optimize();
