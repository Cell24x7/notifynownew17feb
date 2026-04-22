const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.production') });
const { query } = require("../config/db");

async function fix() {
    try {
        console.log("DB_HOST:", process.env.DB_HOST);
        const [res] = await query("UPDATE users SET role = 'superadmin' WHERE email = 'notify@notifynow.in'");
        console.log("✅ Role updated to superadmin:", res.affectedRows);
        
        const [user] = await query("SELECT id, name, role FROM users WHERE email = 'notify@notifynow.in'");
        if (user.length > 0) {
            console.log("Current User State:", user[0]);
        } else {
            console.log("User not found!");
        }
        
        process.exit(0);
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
}

fix();
