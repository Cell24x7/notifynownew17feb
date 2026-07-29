require('dotenv').config();
const { query } = require('../config/db');

async function migrate() {
    try {
        console.log('Starting database migration for Contact Lists...');

        // 1. Create contact_lists table
        await query(`
            CREATE TABLE IF NOT EXISTS contact_lists (
                id VARCHAR(50) PRIMARY KEY,
                user_id VARCHAR(50) NOT NULL,
                name VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY user_list_name (user_id, name)
            )
        `);
        console.log('Created contact_lists table successfully.');

        // 2. Create contact_list_members table
        await query(`
            CREATE TABLE IF NOT EXISTS contact_list_members (
                list_id VARCHAR(50) NOT NULL,
                contact_id VARCHAR(50) NOT NULL,
                PRIMARY KEY (list_id, contact_id)
            )
        `);
        console.log('Created contact_list_members table successfully.');

        console.log('Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
