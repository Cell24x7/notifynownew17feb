const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.production') });
const { query } = require('./config/db');

async function fixChannels() {
    try {
        console.log('🧹 Emergency Cleanup: Sanitizing channels_enabled for all users...');
        
        const [users] = await query('SELECT id, channels_enabled FROM users');
        
        for (const user of users) {
            // Clean up the recursive mess
            let raw = user.channels_enabled || '';
            
            // If it's the recursive monster string, it usually starts with ["["[ or similar
            // We just want the unique channel names
            // Use lowercase to match CampaignCreationStepper.tsx expectations
            const cleanChannels = ["whatsapp", "sms", "rcs", "email", "voicebot"];
            const jsonValue = JSON.stringify(cleanChannels);
            
            await query('UPDATE users SET channels_enabled = ? WHERE id = ?', [jsonValue, user.id]);
            console.log(`✅ User ${user.id} sanitized.`);
        }
        
        console.log('🏁 Cleanup complete.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Cleanup failed:', error);
        process.exit(1);
    }
}

fixChannels();
