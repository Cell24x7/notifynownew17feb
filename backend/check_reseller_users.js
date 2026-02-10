const dotenv = require('dotenv');
dotenv.config(); // Default loads .env in current dir
const { query } = require('./config/db');

async function checkResellerUsers() {
    try {
        console.log('--- Checking USERS table for Resellers ---');
        const [users] = await query('SELECT id, name, email, role, password FROM users WHERE role = "reseller"');
        console.log(users);

        console.log('\n--- Checking RESELLERS table ---');
        const [resellers] = await query('SELECT id, name, email FROM resellers');
        console.log(resellers);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkResellerUsers();
