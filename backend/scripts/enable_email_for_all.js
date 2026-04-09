const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', `.env.${process.env.NODE_ENV || 'development'}`) });
const { query } = require('../config/db');

async function enableEmailForAll() {
    try {
        console.log('📡 Enabling Email channel for all users...');
        
        // Update users table: Add 'email' to channels_enabled if not present
        const [users] = await query('SELECT id, channels_enabled FROM users');
        
        for (const user of users) {
            let channels = [];
            try {
                channels = typeof user.channels_enabled === 'string' 
                    ? JSON.parse(user.channels_enabled || '[]') 
                    : (user.channels_enabled || []);
            } catch (e) {
                channels = String(user.channels_enabled || '').split(',').map(s => s.trim());
            }

            if (!channels.includes('email')) {
                channels.push('email');
                const updated = JSON.stringify(channels);
                await query('UPDATE users SET channels_enabled = ? WHERE id = ?', [updated, user.id]);
                console.log(`✅ User ${user.id} updated with Email support.`);
            }
        }

        // Update plans table: Ensure all active plans have 'email' in channels_allowed
        console.log('📡 Updating all active plans to include Email channel...');
        const [plans] = await query('SELECT id, channels_allowed FROM plans');
        
        for (const plan of plans) {
             let channels = [];
             try {
                 channels = typeof plan.channels_allowed === 'string' 
                     ? JSON.parse(plan.channels_allowed || '[]') 
                     : (plan.channels_allowed || []);
             } catch (e) {
                 channels = String(plan.channels_allowed || '').split(',').map(s => s.trim());
             }

             if (!channels.includes('email')) {
                 channels.push('email');
                 const updated = JSON.stringify(channels);
                 await query('UPDATE plans SET channels_allowed = ? WHERE id = ?', [updated, plan.id]);
                 console.log(`✅ Plan ${plan.id} updated with Email support.`);
             }
        }

        console.log('🏁 Email channel activation complete.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Failed to enable email:', error);
        process.exit(1);
    }
}

enableEmailForAll();
