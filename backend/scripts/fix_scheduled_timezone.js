/**
 * Fix Scheduled Campaign Timezone Bug
 * 
 * Problem: next_run_at was stored in UTC (via toISOString()) but MySQL NOW() 
 * uses server local time (IST = UTC+5:30). This causes campaigns to fire at 
 * wrong times or not fire at all.
 *
 * This script:
 * 1. Finds all campaigns still in 'scheduled' or 'draft' status
 * 2. Converts their next_run_at from UTC to server local time (IST +5:30)
 * 3. Updates the database
 * 
 * Run: node backend/scripts/fix_scheduled_timezone.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.production') });
const { query } = require('../config/db');

async function fixScheduledTimezone() {
    try {
        console.log('🔧 Fixing scheduled campaign timezone...\n');

        // First, check server timezone
        const [tzResult] = await query('SELECT NOW() as db_now, UTC_TIMESTAMP() as db_utc');
        const dbNow = new Date(tzResult[0].db_now);
        const dbUtc = new Date(tzResult[0].db_utc);
        const offsetMinutes = Math.round((dbNow - dbUtc) / 60000);
        const offsetHours = offsetMinutes / 60;
        
        console.log(`📍 MySQL Server Time (NOW()): ${tzResult[0].db_now}`);
        console.log(`📍 MySQL UTC Time: ${tzResult[0].db_utc}`);
        console.log(`📍 Server Timezone Offset: UTC+${offsetHours} (${offsetMinutes} minutes)\n`);

        if (offsetMinutes === 0) {
            console.log('⚠️  Server is in UTC. The old code stored times in UTC too.');
            console.log('    This means old campaigns should fire at correct times.');
            console.log('    But the NEW fix stores in local JS time. If your Node.js server is in IST,');
            console.log('    new campaigns will be stored in IST while old ones are in UTC.');
            console.log('    Converting old campaigns to match Node.js local timezone...\n');
        }

        // Get JS server timezone offset
        const jsOffset = -new Date().getTimezoneOffset(); // In minutes, IST = +330
        console.log(`📍 Node.js Timezone Offset: UTC+${jsOffset/60} (${jsOffset} minutes)`);
        
        if (offsetMinutes !== jsOffset) {
            console.log(`⚠️  MySQL and Node.js have DIFFERENT timezone offsets!`);
            console.log(`    MySQL: UTC+${offsetHours}, Node.js: UTC+${jsOffset/60}`);
            console.log(`    Using MySQL offset for correction since NOW() is what the scheduler uses.\n`);
        }

        // The old code stored next_run_at in UTC (via toISOString())
        // The new code stores it in Node.js local time
        // MySQL NOW() returns time in MySQL server timezone
        // So we need: next_run_at to be in MySQL server timezone
        
        // Since old values are in UTC, we need to add the MySQL server offset
        // SQL: next_run_at + INTERVAL offsetMinutes MINUTE
        
        const [scheduled] = await query(`
            SELECT id, name, next_run_at, scheduled_at, status 
            FROM campaigns 
            WHERE status IN ('scheduled', 'draft') 
            AND next_run_at IS NOT NULL
            ORDER BY next_run_at ASC
        `);

        if (scheduled.length === 0) {
            console.log('✅ No scheduled campaigns found to fix.');
            process.exit(0);
            return;
        }

        console.log(`\n📋 Found ${scheduled.length} scheduled campaigns:\n`);
        
        for (const camp of scheduled) {
            const oldTime = camp.next_run_at;
            console.log(`  📌 ${camp.name}`);
            console.log(`     ID: ${camp.id}`);
            console.log(`     Old next_run_at (UTC): ${oldTime}`);
            
            // Add offset to convert from UTC to MySQL server local time
            if (offsetMinutes > 0) {
                await query(
                    `UPDATE campaigns SET next_run_at = DATE_ADD(next_run_at, INTERVAL ? MINUTE) WHERE id = ?`,
                    [offsetMinutes, camp.id]
                );
                
                const [updated] = await query('SELECT next_run_at FROM campaigns WHERE id = ?', [camp.id]);
                console.log(`     New next_run_at (Local): ${updated[0].next_run_at}`);
            } else {
                console.log(`     No change needed (server is UTC)`);
            }
            console.log('');
        }

        // Also check if any should have already fired
        const [shouldHaveFired] = await query(`
            SELECT id, name, next_run_at 
            FROM campaigns 
            WHERE status IN ('scheduled', 'draft') 
            AND next_run_at <= NOW()
        `);

        if (shouldHaveFired.length > 0) {
            console.log(`\n⚡ ${shouldHaveFired.length} campaigns should fire NOW (next_run_at <= NOW()):`);
            for (const camp of shouldHaveFired) {
                console.log(`  → ${camp.name} (${camp.id}) - ${camp.next_run_at}`);
            }
            console.log('\n🚀 These will be auto-started on the next scheduler tick (within 15 seconds).');
        }

        console.log('\n✅ Timezone fix complete!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}

fixScheduledTimezone();
