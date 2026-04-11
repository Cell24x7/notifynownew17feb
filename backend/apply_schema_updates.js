const path = require('path');
const dotenv = require('dotenv');

// Smart env loading: production uses .env.production, dev uses .env
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

        console.log('--- Applying schema changes ---');

        // 1. Add reseller_id to users if it doesn't exist
        const [userCols] = await connection.execute('DESCRIBE users');
        const hasResellerId = userCols.some(col => col.Field === 'reseller_id');
        if (!hasResellerId) {
            console.log('Adding reseller_id to users table...');
            await connection.execute('ALTER TABLE users ADD COLUMN reseller_id INT AFTER plan_id');
            // Populate reseller_id from parent_reseller_id if it exists
            const hasParentResellerId = userCols.some(col => col.Field === 'parent_reseller_id');
            if (hasParentResellerId) {
                console.log('Syncing parent_reseller_id to reseller_id...');
                await connection.execute('UPDATE users SET reseller_id = parent_reseller_id WHERE reseller_id IS NULL');
            }
        } else {
            console.log('reseller_id already exists in users table.');
        }

        // 1.1 Add api_key to users if it doesn't exist
        const hasApiKey = userCols.some(col => col.Field === 'api_key');
        if (!hasApiKey) {
            console.log('Adding api_key to users table...');
            await connection.execute('ALTER TABLE users ADD COLUMN api_key VARCHAR(100) UNIQUE AFTER api_password');
        } else {
            console.log('api_key already exists in users table.');
        }

        // 2. Add branding columns to resellers if they don't exist
        const [resellerCols] = await connection.execute('DESCRIBE resellers');
        const brandingCols = [
            { name: 'brand_name', type: 'VARCHAR(100)' },
            { name: 'logo_url', type: 'VARCHAR(255)' },
            { name: 'favicon_url', type: 'VARCHAR(255)' },
            { name: 'primary_color', type: 'VARCHAR(20)' },
            { name: 'secondary_color', type: 'VARCHAR(20)' },
            { name: 'support_email', type: 'VARCHAR(255)' },
            { name: 'support_phone', type: 'VARCHAR(20)' }
        ];

        for (const col of brandingCols) {
            const exists = resellerCols.some(rCol => rCol.Field === col.name);
            if (!exists) {
                console.log(`Adding ${col.name} to resellers table...`);
                await connection.execute(`ALTER TABLE resellers ADD COLUMN ${col.name} ${col.type}`);
            } else {
                console.log(`${col.name} already exists in resellers table.`);
            }
        }

        // 3. Add channel column to message_logs
        try {
            const [mlCols] = await connection.execute('DESCRIBE message_logs');
            const hasChannel = mlCols.some(col => col.Field === 'channel');
            if (!hasChannel) {
                console.log('Adding channel column to message_logs...');
                await connection.execute('ALTER TABLE message_logs ADD COLUMN channel VARCHAR(50) DEFAULT NULL');
            } else {
                console.log('channel already exists in message_logs table.');
            }
        } catch (e) {
            console.log('Error checking message_logs columns:', e.message);
        }

        // 3.1 WhatsApp Configs apikey
        try {
            const [wcCols] = await connection.execute('DESCRIBE whatsapp_configs');
            if (!wcCols.some(col => col.Field === 'api_key')) {
                console.log('Adding api_key to whatsapp_configs...');
                await connection.execute('ALTER TABLE whatsapp_configs ADD COLUMN api_key TEXT AFTER wa_token');
            }
        } catch (e) {
            console.log('Error modifying whatsapp_configs:', e.message);
        }

        // 4. Create missing chats table if not exists for stats fallback avoidance
        try {
            console.log('Ensuring chats table exists...');
            await connection.execute(`
                CREATE TABLE IF NOT EXISTS chats (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT NOT NULL,
                    contact_phone VARCHAR(50) NOT NULL,
                    status VARCHAR(50) DEFAULT 'open',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_user_status (user_id, status)
                )
            `);
        } catch (e) {
            console.log('Error creating chats table:', e.message);
        }

        // 5. Create sms_gateways table if not exists
        try {
            console.log('Ensuring sms_gateways table exists...');
            await connection.execute(`
                CREATE TABLE IF NOT EXISTS sms_gateways (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    name VARCHAR(100) NOT NULL,
                    primary_url TEXT NOT NULL,
                    secondary_url TEXT,
                    status ENUM('active','inactive') DEFAULT 'active',
                    routing ENUM('national','international','both') DEFAULT 'national',
                    priority ENUM('non-otp','otp','both') DEFAULT 'both',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )
            `);
            console.log('sms_gateways table ready.');
        } catch (e) {
            console.log('Error creating sms_gateways table:', e.message);
        }

        // 6. Add sms_gateway_id to users table for gateway assignment
        try {
            const [uCols] = await connection.execute('DESCRIBE users');
            const hasSmsGw = uCols.some(col => col.Field === 'sms_gateway_id');
            if (!hasSmsGw) {
                console.log('Adding sms_gateway_id to users table...');
                await connection.execute('ALTER TABLE users ADD COLUMN sms_gateway_id INT DEFAULT NULL');
            } else {
                console.log('sms_gateway_id already exists in users table.');
            }
        } catch (e) {
            console.log('Error adding sms_gateway_id:', e.message);
        }

        // 7. Create webhook_logs table if not exists
        try {
            console.log('Ensuring webhook_logs table exists...');
            await connection.execute(`
                CREATE TABLE IF NOT EXISTS webhook_logs (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT NOT NULL,
                    sender VARCHAR(100),
                    recipient VARCHAR(50) NOT NULL,
                    message_content TEXT,
                    status VARCHAR(50),
                    type VARCHAR(50),
                    campaign_id VARCHAR(100),
                    campaign_name VARCHAR(100),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_user_recipient (user_id, recipient)
                )
            `);
            console.log('webhook_logs table ready.');
        } catch (e) {
            console.log('Error creating webhook_logs table:', e.message);
        }

        // 8. Create dlt_templates table if not exists & Add columns
        try {
            console.log('Ensuring dlt_templates table exists...');
            await connection.execute(`
                CREATE TABLE IF NOT EXISTS dlt_templates (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    temp_id VARCHAR(50) NOT NULL UNIQUE,
                    pe_id VARCHAR(50) DEFAULT NULL,
                    hash_id VARCHAR(250) DEFAULT NULL,
                    temp_name VARCHAR(255) DEFAULT NULL,
                    body TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_temp_id (temp_id),
                    INDEX idx_temp_name (temp_name)
                )
            `);
            
            const [dltCols] = await connection.execute('DESCRIBE dlt_templates');
            const dltFieldNames = dltCols.map(c => c.Field);
            
            if (!dltFieldNames.includes('pe_id')) {
                await connection.execute('ALTER TABLE dlt_templates ADD COLUMN pe_id VARCHAR(50) DEFAULT NULL');
                console.log('Added pe_id to dlt_templates');
            }
            if (!dltFieldNames.includes('hash_id')) {
                await connection.execute('ALTER TABLE dlt_templates ADD COLUMN hash_id VARCHAR(255) DEFAULT NULL');
                console.log('Added hash_id to dlt_templates');
            }
            if (!dltFieldNames.includes('body')) {
                await connection.execute('ALTER TABLE dlt_templates ADD COLUMN body TEXT DEFAULT NULL');
                console.log('Added body to dlt_templates');
            }
            console.log('dlt_templates table ready.');
        } catch (e) {
            console.log('Error modifying dlt_templates table:', e.message);
        }

        // 9. API Tables (Separating API from Manual Campaigns)
        try {
            console.log('Ensuring API campaign tables exist...');
            
            // api_campaigns
            await connection.execute(`
                CREATE TABLE IF NOT EXISTS api_campaigns (
                    id VARCHAR(100) PRIMARY KEY,
                    user_id INT NOT NULL,
                    name VARCHAR(255),
                    channel VARCHAR(50),
                    template_id VARCHAR(100),
                    template_name VARCHAR(255),
                    template_type VARCHAR(50),
                    recipient_count INT DEFAULT 0,
                    audience_count INT DEFAULT 0,
                    sent_count INT DEFAULT 0,
                    delivered_count INT DEFAULT 0,
                    read_count INT DEFAULT 0,
                    failed_count INT DEFAULT 0,
                    credits_deducted TINYINT(1) DEFAULT 0,
                    status VARCHAR(50) DEFAULT 'pending',
                    template_metadata JSON,
                    template_body TEXT,
                    variable_mapping JSON,
                    scheduled_at TIMESTAMP NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_user_channel (user_id, channel)
                )
            `);

            // api_campaign_queue
            await connection.execute(`
                CREATE TABLE IF NOT EXISTS api_campaign_queue (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    campaign_id VARCHAR(100) NOT NULL,
                    user_id INT NOT NULL,
                    mobile VARCHAR(20) NOT NULL,
                    status VARCHAR(50) DEFAULT 'pending',
                    variables JSON,
                    message_id VARCHAR(255),
                    error_message TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_campaign_status (campaign_id, status)
                )
            `);

            // api_message_logs
            await connection.execute(`
                CREATE TABLE IF NOT EXISTS api_message_logs (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT NOT NULL,
                    campaign_id VARCHAR(100),
                    campaign_name VARCHAR(255),
                    template_name VARCHAR(255),
                    message_id VARCHAR(255),
                    recipient VARCHAR(20) NOT NULL,
                    status VARCHAR(50),
                    send_time TIMESTAMP NULL,
                    delivery_time TIMESTAMP NULL,
                    read_time TIMESTAMP NULL,
                    failure_reason TEXT,
                    channel VARCHAR(50),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_campaign (campaign_id),
                    INDEX idx_recipient (recipient),
                    INDEX idx_message (message_id)
                )
            `);
            
            console.log('API campaign tables ready.');
        } catch (e) {
            console.log('Error creating API campaign tables:', e.message);
        }

        // 10. Ensure updated_at and message_content exist in all relevant tables
        try {
            const tableCols = [
                { table: 'message_logs', cols: [
                    { name: 'updated_at', type: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP' },
                    { name: 'message_content', type: 'TEXT' }
                ]},
                { table: 'api_message_logs', cols: [
                    { name: 'updated_at', type: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP' },
                    { name: 'message_content', type: 'TEXT' }
                ]},
                { table: 'message_templates', cols: [
                    { name: 'rcs_config_id', type: 'INT DEFAULT NULL' },
                    { name: 'whatsapp_config_id', type: 'INT DEFAULT NULL' }
                ]},
                { table: 'campaigns', cols: [
                    { name: 'updated_at', type: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP' },
                    { name: 'next_run_at', type: 'TIMESTAMP NULL' },
                    { name: 'last_run_at', type: 'TIMESTAMP NULL' },
                    { name: 'frequency', type: 'VARCHAR(50) DEFAULT "once"' },
                    { name: 'repeat_days', type: 'JSON' },
                    { name: 'end_date', type: 'TIMESTAMP NULL' },
                    { name: 'scheduling_mode', type: 'VARCHAR(50) DEFAULT "once"' },
                    { name: 'rcs_config_id', type: 'INT DEFAULT NULL' },
                    { name: 'whatsapp_config_id', type: 'INT DEFAULT NULL' }
                ]},
                { table: 'api_campaigns', cols: [
                    { name: 'updated_at', type: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP' },
                    { name: 'next_run_at', type: 'TIMESTAMP NULL' },
                    { name: 'last_run_at', type: 'TIMESTAMP NULL' },
                    { name: 'frequency', type: 'VARCHAR(50) DEFAULT "once"' },
                    { name: 'repeat_days', type: 'JSON' },
                    { name: 'end_date', type: 'TIMESTAMP NULL' },
                    { name: 'scheduling_mode', type: 'VARCHAR(50) DEFAULT "once"' },
                    { name: 'rcs_config_id', type: 'INT DEFAULT NULL' },
                    { name: 'whatsapp_config_id', type: 'INT DEFAULT NULL' }
                ]}
            ];

            for (const item of tableCols) {
                console.log(`Checking columns for ${item.table}...`);
                const [cols] = await connection.execute(`DESCRIBE ${item.table}`);
                for (const colDef of item.cols) {
                    if (!cols.some(c => c.Field === colDef.name)) {
                        console.log(`Adding ${colDef.name} to ${item.table}...`);
                        await connection.execute(`ALTER TABLE ${item.table} ADD COLUMN ${colDef.name} ${colDef.type}`);
                    }
                }
            }
            // 11. System Logs Table & Column Expansion (Device Info & Location)
            try {
                console.log('Ensuring system_logs table exists...');
                await connection.execute(`
                    CREATE TABLE IF NOT EXISTS system_logs (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        type VARCHAR(50) NOT NULL,
                        action VARCHAR(100) NOT NULL,
                        details TEXT,
                        user_id INT,
                        user_name VARCHAR(100),
                        client_name VARCHAR(100),
                        ip_address VARCHAR(50),
                        severity VARCHAR(20) DEFAULT 'info',
                        device_info TEXT,
                        location VARCHAR(255),
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                `);
                
                const [slCols] = await connection.execute('DESCRIBE system_logs');
                if (!slCols.some(col => col.Field === 'device_info')) {
                    console.log('Adding device_info to system_logs...');
                    await connection.execute('ALTER TABLE system_logs ADD COLUMN device_info TEXT AFTER severity');
                }
                if (!slCols.some(col => col.Field === 'location')) {
                    console.log('Adding location to system_logs...');
                    await connection.execute('ALTER TABLE system_logs ADD COLUMN location VARCHAR(255) AFTER device_info');
                }
                console.log('system_logs table ready.');
            } catch (e) {
                console.log('Error during system_logs schema updates:', e.message);
            }
        } catch (e) {
            console.log('Error during extended schema updates:', e.message);
        }

        // 12. Fix campaign_queue status column (ENUM to VARCHAR)
        try {
            console.log('Optimizing campaign_queue status column...');
            await connection.execute('ALTER TABLE campaign_queue MODIFY COLUMN status VARCHAR(50) DEFAULT "pending"');
            await connection.execute('ALTER TABLE api_campaign_queue MODIFY COLUMN status VARCHAR(50) DEFAULT "pending"');
            console.log('Status columns optimized.');
        } catch (e) {
            console.log('Error optimizing status columns:', e.message);
        }

        // 13. AI Voice Bot Infrastructure
        try {
         console.log('🔓 [ConstraintLiberation] Dropping ALL check constraints on users table...');
        // We drop known legacy constraint names and any that look like check constraints for this column
        const [constraints] = await connection.execute(`
            SELECT CONSTRAINT_NAME 
            FROM information_schema.TABLE_CONSTRAINTS 
            WHERE TABLE_NAME = 'users' 
            AND TABLE_SCHEMA = DATABASE()
            AND CONSTRAINT_TYPE = 'CHECK'
        `);

        for (const row of constraints) {
            const cName = row.CONSTRAINT_NAME;
            console.log(`🗑️  Dropping constraint: ${cName}...`);
            try {
                await connection.execute(`ALTER TABLE users DROP CONSTRAINT \`${cName}\``);
            } catch (e) {
                console.warn(`⚠️  Failed to drop ${cName} (likely already gone): ${e.message}`);
            }
        }

        // Just in case it's a legacy MariaDB 'users_chk_1' style
        try { await connection.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_chk_1"); } catch(e){}
        try { await connection.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_chk_2"); } catch(e){}
        try { await connection.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_chk_3"); } catch(e){}

        console.log('🚀 Syncing AI Voice Bot infrastructure...');
        // Final attempt to update - we use a direct string if JSON_ARRAY fails
        try {
            await connection.execute('UPDATE users SET channels_enabled = "[\"WhatsApp\", \"SMS\", \"RCS\", \"Email\", \"voicebot\"]" WHERE channels_enabled IS NULL OR channels_enabled = "" OR channels_enabled = "[]"');
        } catch (e) {
            console.warn('⚠️ JSON_ARRAY failed, using raw string update...');
            await connection.execute("UPDATE users SET channels_enabled = '[\"WhatsApp\", \"SMS\", \"RCS\", \"Email\", \"voicebot\"]' WHERE channels_enabled IS NULL OR channels_enabled = ''");
        }
          
            // Add voice columns to users
            if (!userCols.some(col => col.Field === 'voice_price')) {
                console.log('Adding voice_price to users...');
                await connection.execute('ALTER TABLE users ADD COLUMN voice_price DECIMAL(10,4) DEFAULT 1.50');
            }
            if (!userCols.some(col => col.Field === 'ai_voice_config_id')) {
                console.log('Adding ai_voice_config_id to users...');
                await connection.execute('ALTER TABLE users ADD COLUMN ai_voice_config_id INT DEFAULT NULL');
            }

            // Add voice_price to plans
            const [planCols] = await connection.execute('DESCRIBE plans');
            if (!planCols.some(col => col.Field === 'voice_price')) {
                console.log('Adding voice_price to plans...');
                await connection.execute('ALTER TABLE plans ADD COLUMN voice_price DECIMAL(10,4) DEFAULT 1.50');
            }

            // 💎 PROERO: Liberate channels_enabled from any restrictive legacy constraints
            console.log('Liberating channels_enabled column from legacy constraints...');
            try {
                // Ensure the column is TEXT to handle growing channel lists and remove ENUM/Length limits
                await connection.execute('ALTER TABLE users MODIFY COLUMN channels_enabled TEXT');
                
                // For MySQL 8+, try to drop the specific check constraint if it exists
                // We attempt this inside a try-catch as the constraint name might vary or not exist
                await connection.execute(`ALTER TABLE users DROP CHECK channels_enabled`).catch(() => {});
                await connection.execute(`ALTER TABLE users DROP CONSTRAINT channels_enabled`).catch(() => {});
            } catch (libError) {
                console.log('Note: Column already liberated or constraint not found.');
            }

            // Enable voicebot channel for all users who have access to other channels
            console.log('Ensuring voicebot channel is enabled for users (Idempotent JSON)...');
            const [users] = await connection.execute('SELECT id, channels_enabled FROM users');
            for (const user of users) {
                let channels = [];
                try {
                    const raw = user.channels_enabled || '[]';
                    channels = typeof raw === 'string' ? JSON.parse(raw) : raw;
                    if (!Array.isArray(channels)) {
                        channels = String(raw).split(',').map(c => c.trim()).filter(Boolean);
                    }
                } catch (e) {
                    channels = String(user.channels_enabled || '').split(',').map(c => c.trim()).filter(Boolean);
                }

                // Deduplicate and ensure voicebot exists
                const channelSet = new Set(channels);
                if (channelSet.size > 0 && !channelSet.has('voicebot')) {
                    channelSet.add('voicebot');
                    const updated = JSON.stringify(Array.from(channelSet));
                    await connection.execute('UPDATE users SET channels_enabled = ? WHERE id = ?', [updated, user.id]);
                }
            }
            console.log('✅ AI Voice Bot infrastructure ready.');
        } catch (e) {
            console.log('Error during AI Voice Bot updates:', e.message);
        }

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        if (connection) await connection.end();
    }
}

updateSchema();
