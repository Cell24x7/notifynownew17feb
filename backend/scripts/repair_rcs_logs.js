/**
 * REPAIR RCS LOGS SCRIPT
 * 
 * This script fixes two main issues:
 * 1. webhook_logs entries with missing 'user_id' for RCS messages.
 * 2. webhook_logs entries with missing 'type' (ensuring they are set to 'rcs').
 * 3. Normalizes 'sender' and 'recipient' phone numbers.
 */

const { query } = require('../config/db');

async function repair() {
    console.log('🚀 Starting RCS logs repair...');

    try {
        // 1. Fix missing 'type' for anything with business_id (Dotgo Bot ID)
        console.log('🔍 Fixing missing types...');
        const [typeUpdate] = await query(
            "UPDATE webhook_logs SET type = 'rcs' WHERE type IS NULL OR type = '' OR type = 'rcs' AND business_id IS NOT NULL"
        );
        console.log(`✅ Updated type to 'rcs' for ${typeUpdate.affectedRows} entries.`);

        // 2. Resolve missing user_id for RCS logs
        console.log('🔍 Finding logs with missing user_id...');
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
                process.stdout.write('.');
            }
        }
        console.log('\n✅ User IDs resolved.');

        // 3. Normalize numbers in webhook_logs
        console.log('🔍 Normalizing phone numbers...');
        // This is a safety step: Ensure sender/recipient look like they should for the UI
        await query(`
            UPDATE webhook_logs 
            SET sender = REPLACE(sender, '+', ''), recipient = REPLACE(recipient, '+', '')
            WHERE type = 'rcs' AND (sender LIKE '+%' OR recipient LIKE '+%')
        `);
        console.log('✅ Phone numbers normalized.');

        console.log('✨ REPAIR COMPLETE!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Repair failed:', err.message);
        process.exit(1);
    }
}

repair();
