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

        // Set next_run_at to scheduled_at adjusted from IST (+05:30) to Database timezone
        const [offsetRows] = await query("SELECT TIMESTAMPDIFF(MINUTE, UTC_TIMESTAMP(), NOW()) as offset_mins");
        const dbOffsetMins = offsetRows[0]?.offset_mins || 0;

        const [campaignsList] = await query(`
            SELECT id, name, scheduled_at, status 
            FROM campaigns 
            WHERE status IN ('scheduled', 'draft') 
            AND scheduled_at IS NOT NULL
        `);

        console.log(`📋 Found ${campaignsList.length} campaigns to process...`);
        let updatedCount = 0;

        for (const camp of campaignsList) {
            let nextRunAt;
            try {
                let scheduledDate = camp.scheduled_at;
                if (!scheduledDate) continue;
                
                if (typeof scheduledDate === 'string') {
                    // It's a string, e.g. "2026-06-05 15:30:00"
                    const cleanStr = scheduledDate.replace(' ', 'T');
                    scheduledDate = new Date(cleanStr + "+05:30");
                } else if (scheduledDate instanceof Date) {
                    // Extract the raw parts directly to avoid timezone shift
                    const year = scheduledDate.getFullYear();
                    const month = String(scheduledDate.getMonth() + 1).padStart(2, '0');
                    const date = String(scheduledDate.getDate()).padStart(2, '0');
                    const hours = String(scheduledDate.getHours()).padStart(2, '0');
                    const minutes = String(scheduledDate.getMinutes()).padStart(2, '0');
                    const seconds = String(scheduledDate.getSeconds()).padStart(2, '0');
                    scheduledDate = new Date(`${year}-${month}-${date}T${hours}:${minutes}:${seconds}+05:30`);
                } else {
                    scheduledDate = new Date(scheduledDate);
                }

                if (isNaN(scheduledDate.getTime())) {
                    console.log(`  ⚠️ Skipping invalid scheduled date for ${camp.name}: ${camp.scheduled_at}`);
                    continue;
                }

                const dbDate = new Date(scheduledDate.getTime() + dbOffsetMins * 60 * 1000);
                const pad = (n) => String(n).padStart(2, '0');
                nextRunAt = `${dbDate.getUTCFullYear()}-${pad(dbDate.getUTCMonth()+1)}-${pad(dbDate.getUTCDate())} ${pad(dbDate.getUTCHours())}:${pad(dbDate.getUTCMinutes())}:${pad(dbDate.getUTCSeconds())}`;
            } catch (e) {
                console.log(`  ⚠️ Error parsing scheduled date for ${camp.name}:`, e.message);
                continue;
            }
            
            await query(`UPDATE campaigns SET next_run_at = ? WHERE id = ?`, [nextRunAt, camp.id]);
            console.log(`  ✅ Updated: ${camp.name} (ID: ${camp.id}) to DB Time: ${nextRunAt}`);
            updatedCount++;
        }

        console.log(`✅ Successfully updated ${updatedCount} campaigns.`);

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
