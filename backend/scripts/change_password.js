const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// Load environment variables correctly
const envPath = fs.existsSync(path.join(__dirname, '../.env.production')) 
    ? path.join(__dirname, '../.env.production') 
    : path.join(__dirname, '../.env');

require('dotenv').config({ path: envPath });

const { query } = require('../config/db');

async function changePassword(email, newPassword) {
    console.log(`--- Changing Password for: ${email} ---`);
    console.log(`📡 Using environment: ${path.basename(envPath)}`);
    
    if (!email || !newPassword) {
        console.error('❌ Error: Email and newPassword are required.');
        process.exit(1);
    }

    try {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        // Update user password
        const [result] = await query(
            'UPDATE users SET password = ? WHERE email = ?',
            [hashedPassword, email]
        );
        
        if (result.affectedRows > 0) {
            console.log(`✅ Password successfully changed for: ${email}`);
        } else {
            console.warn(`⚠️ User with email '${email}' not found.`);
        }
        
        process.exit(0);
    } catch (err) {
        console.error('❌ Failed to change password:', err.message);
        process.exit(1);
    }
}

// Get arguments from command line
const args = process.argv.slice(2);
const emailArg = args[0] || 'admin@notifynow.in';
const passwordArg = args[1];

if (!passwordArg) {
    console.log('Usage: node backend/scripts/change_password.js <email> <new_password>');
    console.log('Example: node backend/scripts/change_password.js admin@notifynow.in MyNewPass@123');
    process.exit(1);
}

changePassword(emailArg, passwordArg);
