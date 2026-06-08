const path = require('path');
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
require('dotenv').config({ path: path.join(__dirname, '../', envFile) });
const { query } = require('../config/db');

async function run() {
    console.log('🔄 Running safe migration for Chat and Tags metadata...');

    // 1. Ensure contacts has assigned_agent and auto_reply
    try {
        console.log('Checking contacts columns...');
        const [cols] = await query('SHOW COLUMNS FROM contacts');
        const colNames = cols.map(c => c.Field);

        if (!colNames.includes('assigned_agent')) {
            console.log('Adding assigned_agent column to contacts...');
            await query('ALTER TABLE contacts ADD COLUMN assigned_agent VARCHAR(255) DEFAULT NULL');
            console.log('✅ Added assigned_agent column to contacts.');
        } else {
            console.log('👍 assigned_agent column already exists in contacts.');
        }

        if (!colNames.includes('auto_reply')) {
            console.log('Adding auto_reply column to contacts...');
            await query('ALTER TABLE contacts ADD COLUMN auto_reply TINYINT(1) DEFAULT 1');
            console.log('✅ Added auto_reply column to contacts.');
        } else {
            console.log('👍 auto_reply column already exists in contacts.');
        }
    } catch (e) {
        console.error('❌ Error checking/updating contacts table:', e.message);
    }

    // 2. Ensure contact_tags has status
    try {
        console.log('Checking contact_tags columns...');
        const [cols] = await query('SHOW COLUMNS FROM contact_tags');
        const colNames = cols.map(c => c.Field);

        if (!colNames.includes('status')) {
            console.log('Adding status column to contact_tags...');
            await query("ALTER TABLE contact_tags ADD COLUMN status VARCHAR(20) DEFAULT 'active'");
            console.log('✅ Added status column to contact_tags.');
        } else {
            console.log('👍 status column already exists in contact_tags.');
        }
    } catch (e) {
        console.error('❌ Error checking/updating contact_tags table:', e.message);
    }

    console.log('🏁 Migration completed.');
    process.exit(0);
}

run();
