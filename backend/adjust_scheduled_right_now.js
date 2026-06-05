const path = require('path');
const dotenv = require('dotenv');
// Load production env variables
dotenv.config({ path: path.join(__dirname, '.env.production') });

const { query } = require('./config/db');

async function main() {
    try {
        console.log("Checking scheduled campaigns...");
        const [scheduled] = await query("SELECT id, name, next_run_at, status FROM campaigns WHERE status = 'scheduled'");
        console.log("Currently scheduled campaigns in database:", scheduled);

        if (scheduled.length > 0) {
            console.log("\nAdjusting scheduled campaigns from IST (UTC+5:30) to Database timezone (UTC)...");
            // Subtract 330 minutes (5.5 hours) from next_run_at if next_run_at has the wrong IST timezone
            const [updateResult] = await query(`
                UPDATE campaigns 
                SET next_run_at = DATE_SUB(next_run_at, INTERVAL 330 MINUTE) 
                WHERE status = 'scheduled' AND next_run_at > NOW()
            `);
            console.log(`Updated campaigns: ${updateResult.affectedRows}`);

            // Fetch adjusted campaigns to confirm
            const [updatedScheduled] = await query("SELECT id, name, next_run_at, status FROM campaigns WHERE status = 'scheduled'");
            console.log("Adjusted campaigns:", updatedScheduled);
        } else {
            console.log("No scheduled campaigns found to adjust.");
        }

    } catch (err) {
        console.error("Error in adjust script:", err);
    } finally {
        process.exit(0);
    }
}

main();
