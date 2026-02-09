require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { query } = require('../config/db');

async function addPermissionsColumn() {
    try {
        console.log('Checking for permissions column in plans table...');

        // Check if column exists
        const [columns] = await query(`
      SHOW COLUMNS FROM plans LIKE 'permissions'
    `);

        if (columns.length > 0) {
            console.log('Column "permissions" already exists.');
        } else {
            console.log('Adding "permissions" column...');
            await query(`
        ALTER TABLE plans
        ADD COLUMN permissions JSON NULL DEFAULT NULL AFTER api_access
      `);
            console.log('Column "permissions" added successfully.');
        }

        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err.message);
        process.exit(1);
    }
}

addPermissionsColumn();
