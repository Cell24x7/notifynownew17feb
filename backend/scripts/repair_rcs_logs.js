const path = require('path');
const dotenv = require('dotenv');

// Smart env loading: prioritizes .env.production on servers
const currentPath = process.cwd();
let envFile = '.env';

// Check if running in a production-like directory or NODE_ENV is production
if (currentPath.includes('notifynow.in') || process.env.NODE_ENV === 'production') {
    envFile = '.env.production';
}

// Load from backend folder since this script is in backend/scripts
dotenv.config({ path: path.join(__dirname, '..', envFile) });

const { query } = require('../config/db');

async function repair() {
    console.log('🚀 Starting Comprehensive RCS logs repair...');

    try {
        // 1. Fix missing 'type' for anything with business_id (Dotgo Bot ID)
        console.log('🔍 Fixing missing types...');
        const [typeUpdate] = await query(
            "UPDATE webhook_logs SET type = 'rcs' WHERE type IS NULL OR type = '' OR (business_id IS NOT NULL AND type != 'rcs')"
        );
        console.log(`✅ Updated type to 'rcs' for ${typeUpdate.affectedRows} entries.`);

        // 2. Decode missing message_content from message_data (base64)
        console.log('🔍 Decoding missing message contents from base64...');
        const [encodedLogs] = await query(
            "SELECT id, message_data FROM webhook_logs WHERE (message_content IS NULL OR message_content = '') AND (message_data IS NOT NULL AND message_data != '') AND type = 'rcs'"
        );
        
        let decodeCount = 0;
        for (const log of encodedLogs) {
            try {
                const decodedString = Buffer.from(log.message_data, 'base64').toString('utf-8');
                const decodedData = JSON.parse(decodedString);
                const content = decodedData.text || decodedData.message || (decodedData.response && decodedData.response.text);
                
                if (content) {
                    await query('UPDATE webhook_logs SET message_content = ? WHERE id = ?', [content, log.id]);
                    decodeCount++;
                }
            } catch (e) {
                // Silently skip if not valid JSON/Base64
            }
        }
        console.log(`✅ Decoded ${decodeCount} message contents.`);

        // 3. Resolve missing user_id for RCS logs
        console.log('🔍 Resolving missing user_ids...');
        const [missingUsers] = await query(
            "SELECT id, business_id, sender, recipient FROM webhook_logs WHERE user_id IS NULL AND type = 'rcs'"
        );
        
        console.log(`📋 Found ${missingUsers.length} entries to fix.`);

        for (const log of missingUsers) {
            let userId = null;
            const contactPhone = log.sender?.replace(/\D/g, '') || log.recipient?.replace(/\D/g, '');

            if (log.business_id && contactPhone) {
                // Find config
                const [configs] = await query('SELECT id FROM rcs_configs WHERE bot_id = ? LIMIT 1', [log.business_id]);
                if (configs.length > 0) {
                    const configId = configs[0].id;
                    
                    // Find last user for this contact
                    const [lastUser] = await query(
                        `SELECT user_id FROM message_logs 
                         WHERE recipient IN (?, ?) 
                         AND user_id IN (SELECT id FROM users WHERE rcs_config_id = ?)
                         ORDER BY created_at DESC LIMIT 1`,
                        [contactPhone, `+${contactPhone}`, configId]
                    );

                    if (lastUser.length > 0) {
                        userId = lastUser[0].user_id;
                    } else {
                        // Fallback: First user for this config
                        const [fallback] = await query('SELECT id FROM users WHERE rcs_config_id = ? LIMIT 1', [configId]);
                        if (fallback.length > 0) userId = fallback[0].id;
                    }
                }
            }

            if (userId) {
                await query('UPDATE webhook_logs SET user_id = ? WHERE id = ?', [userId, log.id]);
            }
        }
        console.log('✅ User IDs resolved.');

        // 4. Backfill message_logs (Detailed Reports) from webhook_logs
        console.log('🔍 Backfilling Detailed Reports (message_logs) from webhook_logs...');
        const [allLogs] = await query(
            `SELECT * FROM webhook_logs 
             WHERE type = 'rcs' 
             AND user_id IS NOT NULL 
             AND (message_content IS NOT NULL AND message_content != '')`
        );

        let backfillCount = 0;
        for (const log of allLogs) {
            // Check if it already exists in message_logs by message_id
            const mId = log.message_id || log.message_id_envelope;
            if (!mId) continue;

            const [exists] = await query('SELECT id FROM message_logs WHERE message_id = ? LIMIT 1', [mId]);
            if (exists.length === 0) {
                const contactPhone = log.sender?.replace(/\D/g, '') || log.recipient?.replace(/\D/g, '');
                const status = (log.status === 'received' || log.status === 'sent') ? log.status : 'sent';
                
                await query(
                    `INSERT INTO message_logs (id, user_id, recipient, channel, status, message_id, message_content, created_at) 
                     VALUES (?, ?, ?, 'RCS', ?, ?, ?, ?)`,
                    [`REPAIR_${log.id}`, log.user_id, contactPhone, status, mId, log.message_content, log.created_at || new Date()]
                );
                backfillCount++;
            }
        }
        console.log(`✅ Backfilled ${backfillCount} messages into Reports.`);

        // 5. Normalization
        console.log('🔍 Final phone number normalization...');
        await query(`
            UPDATE webhook_logs 
            SET sender = REPLACE(sender, '+', ''), recipient = REPLACE(recipient, '+', '')
            WHERE type = 'rcs' AND (sender LIKE '+%' OR recipient LIKE '+%')
        `);
        console.log('✅ Normalization complete.');

        console.log('✨ ALL REPAIRS FINISHED!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Repair failed:', err.message);
        process.exit(1);
    }
}

repair();
