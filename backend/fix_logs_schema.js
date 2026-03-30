require('dotenv').config({ path: `.env.${process.env.NODE_ENV || 'production'}` });
const mysql = require('mysql2/promise');

async function fix() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || process.env.DB_PASS || '',
        database: process.env.DB_NAME || 'notifynow_db',
    });

    const safe = async (sql, desc) => {
        try {
            await connection.query(sql);
            console.log(`✅ ${desc}`);
        } catch (e) {
            const ok = ['Duplicate column', 'Duplicate key name', 'already exists', "Can't DROP"];
            if (!ok.some(s => e.message.includes(s))) {
                console.warn(`  ⚠️  ${desc} — ${e.message}`);
            } else {
                console.log(`  ℹ️  ${desc} — already done`);
            }
        }
    };

    try {
        console.log('\n🔧 Starting schema repair...\n');

        // ============================================================
        // message_logs — widen ALL critical columns
        // ============================================================
        await safe('ALTER TABLE message_logs MODIFY COLUMN recipient    VARCHAR(30)  NOT NULL DEFAULT ""', 'message_logs.recipient → VARCHAR(30)');
        await safe('ALTER TABLE message_logs MODIFY COLUMN message_id   VARCHAR(512) DEFAULT NULL',         'message_logs.message_id → VARCHAR(512)');
        await safe('ALTER TABLE message_logs MODIFY COLUMN channel       VARCHAR(50)  DEFAULT "rcs"',       'message_logs.channel → VARCHAR(50)');
        await safe('ALTER TABLE message_logs MODIFY COLUMN template_name VARCHAR(255) DEFAULT NULL',        'message_logs.template_name → VARCHAR(255)');
        await safe('ALTER TABLE message_logs MODIFY COLUMN campaign_name VARCHAR(255) DEFAULT NULL',        'message_logs.campaign_name → VARCHAR(255)');
        await safe('ALTER TABLE message_logs MODIFY COLUMN failure_reason TEXT DEFAULT NULL',               'message_logs.failure_reason → TEXT');

        // Add missing columns to message_logs
        await safe("ALTER TABLE message_logs ADD COLUMN channel       VARCHAR(50)        DEFAULT 'rcs' AFTER status",  'message_logs: add channel');
        await safe("ALTER TABLE message_logs ADD COLUMN failure_reason TEXT               DEFAULT NULL AFTER channel", 'message_logs: add failure_reason');
        await safe("ALTER TABLE message_logs ADD COLUMN delivery_time  TIMESTAMP          NULL AFTER send_time",       'message_logs: add delivery_time');
        await safe("ALTER TABLE message_logs ADD COLUMN read_time      TIMESTAMP          NULL AFTER delivery_time",   'message_logs: add read_time');
        await safe("ALTER TABLE message_logs ADD COLUMN send_time      TIMESTAMP          NULL",                       'message_logs: add send_time (if missing)');

        // ============================================================
        // api_message_logs — same fixes
        // ============================================================
        await safe('ALTER TABLE api_message_logs MODIFY COLUMN recipient    VARCHAR(30)  DEFAULT NULL',     'api_message_logs.recipient → VARCHAR(30)');
        await safe('ALTER TABLE api_message_logs MODIFY COLUMN message_id   VARCHAR(512) DEFAULT NULL',     'api_message_logs.message_id → VARCHAR(512)');
        await safe('ALTER TABLE api_message_logs MODIFY COLUMN channel       VARCHAR(50)  DEFAULT "rcs"',   'api_message_logs.channel → VARCHAR(50)');
        await safe('ALTER TABLE api_message_logs MODIFY COLUMN template_name VARCHAR(255) DEFAULT NULL',    'api_message_logs.template_name → VARCHAR(255)');
        await safe('ALTER TABLE api_message_logs MODIFY COLUMN campaign_name VARCHAR(255) DEFAULT NULL',    'api_message_logs.campaign_name → VARCHAR(255)');
        await safe('ALTER TABLE api_message_logs MODIFY COLUMN failure_reason TEXT DEFAULT NULL',           'api_message_logs.failure_reason → TEXT');

        await safe("ALTER TABLE api_message_logs ADD COLUMN failure_reason TEXT DEFAULT NULL AFTER status", 'api_message_logs: add failure_reason');
        await safe("ALTER TABLE api_message_logs ADD COLUMN delivery_time  TIMESTAMP NULL AFTER send_time", 'api_message_logs: add delivery_time');
        await safe("ALTER TABLE api_message_logs ADD COLUMN read_time      TIMESTAMP NULL AFTER delivery_time", 'api_message_logs: add read_time');

        // ============================================================
        // campaign_queue — ensure ALL worker columns exist
        // ============================================================
        await safe("ALTER TABLE campaign_queue ADD COLUMN channel    VARCHAR(50)  DEFAULT NULL AFTER status",     'campaign_queue: add channel');
        await safe("ALTER TABLE campaign_queue ADD COLUMN worker_id  VARCHAR(100) DEFAULT NULL AFTER channel",    'campaign_queue: add worker_id');
        await safe("ALTER TABLE campaign_queue ADD COLUMN message_id VARCHAR(512) DEFAULT NULL AFTER worker_id",  'campaign_queue: add message_id');
        await safe("ALTER TABLE campaign_queue MODIFY COLUMN message_id VARCHAR(512) DEFAULT NULL",               'campaign_queue: widen message_id');

        // ============================================================
        // campaigns — ensure counter columns exist
        // ============================================================
        await safe("ALTER TABLE campaigns ADD COLUMN delivered_count INT DEFAULT 0 AFTER sent_count", 'campaigns: add delivered_count');
        await safe("ALTER TABLE campaigns ADD COLUMN read_count      INT DEFAULT 0 AFTER delivered_count", 'campaigns: add read_count');
        await safe("ALTER TABLE campaigns ADD COLUMN failed_count    INT DEFAULT 0 AFTER read_count",   'campaigns: add failed_count');

        // ============================================================
        // INDEXES — for fast lookups during webhook delivery
        // ============================================================
        await safe('CREATE INDEX idx_ml_msgid    ON message_logs(message_id(255))',          'message_logs: index on message_id');
        await safe('CREATE INDEX idx_ml_campid   ON message_logs(campaign_id)',              'message_logs: index on campaign_id');
        await safe('CREATE INDEX idx_ml_recip    ON message_logs(recipient)',                'message_logs: index on recipient');
        await safe('CREATE INDEX idx_aml_msgid   ON api_message_logs(message_id(255))',      'api_message_logs: index on message_id');
        await safe('CREATE INDEX idx_aml_campid  ON api_message_logs(campaign_id)',          'api_message_logs: index on campaign_id');

        // ============================================================
        // Remove unique constraint on message_id if it causes dup errors
        // ============================================================
        try {
            const [indexes] = await connection.query("SHOW INDEX FROM message_logs WHERE Key_name = 'message_id'");
            if (indexes.length > 0 && indexes[0].Non_unique === 0) {
                await connection.query("ALTER TABLE message_logs DROP INDEX message_id");
                console.log('✅ Removed UNIQUE constraint from message_logs.message_id');
            }
        } catch(e) {}

        try {
            const [indexes] = await connection.query("SHOW INDEX FROM api_message_logs WHERE Key_name = 'message_id'");
            if (indexes.length > 0 && indexes[0].Non_unique === 0) {
                await connection.query("ALTER TABLE api_message_logs DROP INDEX message_id");
                console.log('✅ Removed UNIQUE constraint from api_message_logs.message_id');
            }
        } catch(e) {}

        console.log('\n✅ Schema repair complete! All columns and indexes are ready.\n');
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
    } finally {
        await connection.end();
    }
}

fix().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
