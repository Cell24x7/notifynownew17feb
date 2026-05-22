/**
 * Final Scheduled Campaigns Timezone Fix
 * 
 * Sets next_run_at = scheduled_at directly for all scheduled/draft campaigns.
 * Since scheduled_at contains the local time scheduled by the user, and the new 
 * code uses local times, this aligns next_run_at perfectly with local server time.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.production') });
const { query } = require('../config/db');

async function fixScheduledFinal() {
    try {
        console.log('🔧 Restoring scheduled campaigns to their actual local times...\n');

        // Set next_run_at to scheduled_at
        const [result] = await query(`
            UPDATE campaigns 
            SET next_run_at = scheduled_at 
            WHERE status IN ('scheduled', 'draft') 
            AND scheduled_at IS NOT NULL
        `);

        console.log(`✅ Successfully updated ${result.affectedRows} campaigns.`);

        // Print the status
        const [campaigns] = await query(`
            SELECT id, name, next_run_at, scheduled_at, status 
            FROM campaigns 
            WHERE status IN ('scheduled', 'draft')
            ORDER BY next_run_at ASC
        `);

        if (campaigns.length > 0) {
            console.log('\n📋 Updated scheduled campaigns list:');
            for (const camp of campaigns) {
                console.log(`  📌 ${camp.name}`);
                console.log(`     ID: ${camp.id}`);
                console.log(`     Scheduled Time (local): ${camp.scheduled_at}`);
                console.log(`     Next Run At (local):    ${camp.next_run_at}`);
                console.log(`     Status:                 ${camp.status}`);
            }
        } else {
            console.log('\nℹ️ No scheduled campaigns found.');
        }

        process.exit(0);
    } catch (err) {
        console.error('❌ Error during fix:', err);
        process.exit(1);
    }
}

fixScheduledFinal();
