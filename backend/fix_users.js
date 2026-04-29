require('dotenv').config({ path: '.env.production' });
const { query } = require('./config/db');

async function fixOrphans() {
    try {
        console.log('🔍 Checking for orphaned reseller users...');
        // Find users with role = reseller who don't have a matching email in resellers table
        const [users] = await query("SELECT id, email FROM users WHERE role = 'reseller' AND email NOT IN (SELECT email FROM resellers)");
        
        if (users.length === 0) {
            console.log('✅ No orphaned users found.');
            process.exit(0);
        }

        console.log(`⚠️ Found ${users.length} orphaned user(s):`, users.map(u => u.email).join(', '));
        
        for (const user of users) {
            await query("DELETE FROM users WHERE id = ?", [user.id]);
            console.log(`🗑️ Deleted orphaned user: ${user.email}`);
        }
        
        console.log('🎉 Fix complete! You can now add the resellers from the UI.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

fixOrphans();
