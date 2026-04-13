const path = require('path');
const dotenv = require('dotenv');
const mysql = require('mysql2/promise');

// Load environment variables
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
dotenv.config({ path: path.join(__dirname, '..', envFile) });

async function initVoiceInfrastructure() {
    console.log(`🎙️ Deploying AI Voice Bot Infrastructure on ${process.env.NODE_ENV || 'development'}...`);
    
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME
        });

        console.log('--- Phase 1: Creating configuration tables ---');
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS voice_configs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT DEFAULT NULL,
                name VARCHAR(100) NOT NULL,
                api_user VARCHAR(100) NOT NULL,
                api_password VARCHAR(100) NOT NULL,
                status ENUM('active', 'inactive') DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ voice_configs table ready.');

        console.log('--- Phase 2: Updating user and campaign tables ---');
        
        // Helper to check and add columns
        const addColumnIfMissing = async (table, column, definition) => {
            const [cols] = await connection.execute(`DESCRIBE ${table}`);
            if (!cols.some(c => c.Field === column)) {
                console.log(`Adding ${column} to ${table}...`);
                await connection.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
                return true;
            }
            return false;
        };

        await addColumnIfMissing('users', 'ai_voice_config_id', 'INT DEFAULT NULL');
        await addColumnIfMissing('users', 'voice_price', 'DECIMAL(10,4) DEFAULT 1.50');
        await addColumnIfMissing('campaigns', 'ai_voice_config_id', 'INT DEFAULT NULL');
        await addColumnIfMissing('api_campaigns', 'ai_voice_config_id', 'INT DEFAULT NULL');
        
        console.log('--- Phase 3: Enabling voice channel for users ---');
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

             const channelSet = new Set(channels);
             if (channelSet.size > 0 && !channelSet.has('voicebot')) {
                 channelSet.add('voicebot');
                 const updated = JSON.stringify(Array.from(channelSet));
                 await connection.execute('UPDATE users SET channels_enabled = ? WHERE id = ?', [updated, user.id]);
             }
        }
        
        console.log('--- Phase 4: Inserting default system gateway ---');
        const [existing] = await connection.execute('SELECT id FROM voice_configs WHERE api_user = "mdsmedia" LIMIT 1');
        if (existing.length === 0) {
            console.log('Inserting default mdsmedia credentials...');
            await connection.execute(
                'INSERT INTO voice_configs (name, api_user, api_password, status) VALUES (?, ?, ?, ?)',
                ['Default System Gateway', 'mdsmedia', 'apimdsmedia', 'active']
            );
        }

        console.log('✨ AI Voice Bot Infrastructure successfully deployed.');
    } catch (err) {
        console.error('❌ Infrastructure Deployment Failed:', err.message);
    } finally {
        if (connection) await connection.end();
    }
}

initVoiceInfrastructure();
