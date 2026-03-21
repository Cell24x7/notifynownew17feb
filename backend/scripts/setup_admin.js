const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// Load environment variables correctly
const envPath = fs.existsSync(path.join(__dirname, '../.env.production')) 
    ? path.join(__dirname, '../.env.production') 
    : path.join(__dirname, '../.env');

require('dotenv').config({ path: envPath });

const { query } = require('../config/db');

async function setupSuperAdmin() {
    console.log('--- Setting up Super Admin User ---');
    console.log(`📡 Using environment: ${path.basename(envPath)}`);
    
    const email = 'Sandy@gmail.com';
    const password = 'Sandy@1234';
    const name = 'Sandy';
    const role = 'superadmin'; // We will update the UI to handle this
    
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Check if user exists
        const [existing] = await query('SELECT id FROM users WHERE email = ?', [email]);
        
        if (existing.length > 0) {
            console.log(`Updating existing user: ${email}`);
            await query(
                'UPDATE users SET password = ?, role = ?, name = ?, status = "active", is_verified = 1 WHERE email = ?',
                [hashedPassword, role, name, email]
            );
        } else {
            console.log(`Creating new super admin: ${email}`);
            await query(
                'INSERT INTO users (email, password, role, name, status, is_verified, wallet_balance, created_at) VALUES (?, ?, ?, ?, "active", 1, 9999, NOW())',
                [email, hashedPassword, role, name]
            );
        }
        
        console.log('✅ Super Admin setup complete.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Failed to setup Super Admin:', err.message);
        process.exit(1);
    }
}

setupSuperAdmin();
