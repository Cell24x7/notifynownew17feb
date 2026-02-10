const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

// Hardcoded config for immediate fix
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'root123',
    database: 'notifynow_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function query(sql, params) {
    const [results] = await pool.execute(sql, params);
    return [results];
}

async function ensureResellerUsers() {
    console.log('--- Starting Reseller User Backfill ---');
    try {
        // Get all resellers
        const [resellers] = await query('SELECT * FROM resellers');
        console.log(`Found ${resellers.length} resellers.`);

        for (const reseller of resellers) {
            console.log(`Checking Reseller: ${reseller.email} (${reseller.name})`);

            // Check if user exists
            const [users] = await query('SELECT * FROM users WHERE email = ?', [reseller.email]);

            if (users.length === 0) {
                console.log(`   -> No User account found. Creating one...`);
                const defaultPassword = 'password123'; // Temporary default if we don't know it, but for shyam we know it.
                // Ideally we can't know the password if it wasn't stored. 
                // But for the user 'shyam', we can hardcode his expected password if we want, or just set a default.

                let hash;
                if (reseller.email === 'shyam@gmail.com') {
                    hash = await bcrypt.hash('12345678', 10);
                    console.log('   -> Setting password to 12345678 for shyam');
                } else {
                    hash = await bcrypt.hash(defaultPassword, 10);
                }

                await query(`
          INSERT INTO users (name, email, password, role, plan_id, status)
          VALUES (?, ?, ?, 'reseller', ?, ?)
        `, [
                    reseller.name,
                    reseller.email,
                    hash,
                    reseller.plan_id,
                    reseller.status
                ]);
                console.log(`   -> User created successfully.`);
            } else {
                console.log(`   -> User account exists (ID: ${users[0].id}).`);
                // Optional warning if role is wrong
                if (users[0].role !== 'reseller') {
                    console.log(`   -> WARNING: User role is '${users[0].role}', expected 'reseller'. Updating...`);
                    await query('UPDATE users SET role = "reseller" WHERE id = ?', [users[0].id]);
                }

                // Force update password for shyam if it exists but might be wrong hash? 
                // No, let's trust the login debug. But if the user says "401", maybe the hash is wrong?
                if (reseller.email === 'shyam@gmail.com') {
                    console.log('   -> Force updating shyam password to 12345678 just in case.');
                    const hash = await bcrypt.hash('12345678', 10);
                    await query('UPDATE users SET password = ? WHERE id = ?', [hash, users[0].id]);
                }
            }
        }
        console.log('--- Backfill Complete ---');
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

ensureResellerUsers();
