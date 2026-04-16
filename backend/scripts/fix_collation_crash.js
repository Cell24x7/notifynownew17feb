const path = require('path');
const dotenv = require('dotenv');
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
dotenv.config({ path: path.join(__dirname, '..', envFile) });

const { query } = require('../config/db');

async function fixCollationJoinCrash() {
    console.log('--- Starting Urgent Collation/Emoji Join Fix ---');
    try {
        // Find existing foreign keys on template_buttons
        process.stdout.write('Checking foreign keys... ');
        const [fks] = await query(`
            SELECT CONSTRAINT_NAME 
            FROM information_schema.KEY_COLUMN_USAGE 
            WHERE TABLE_NAME = 'template_buttons' AND TABLE_SCHEMA = DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL
        `);
        console.log('Done');

        for (const row of fks) {
            try {
                process.stdout.write(`Dropping FK ${row.CONSTRAINT_NAME}... `);
                await query(`ALTER TABLE template_buttons DROP FOREIGN KEY ${row.CONSTRAINT_NAME}`);
                console.log('Done');
            } catch (err) {
                console.log(`Failed: ${err.message}`);
            }
        }

        // Now upgrade both tables safely
        try {
            process.stdout.write('Upgrading message_templates to utf8mb4... ');
            await query(`ALTER TABLE message_templates CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
            console.log('✅ Done');
        } catch (e) { console.log(`Failed: ${e.message}`); }

        try {
            process.stdout.write('Upgrading template_buttons to utf8mb4... ');
            await query(`ALTER TABLE template_buttons CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
            console.log('✅ Done');
        } catch (e) { console.log(`Failed: ${e.message}`); }

        // Restore FK
        try {
            process.stdout.write('Restoring Foreign Key... ');
            await query(`ALTER TABLE template_buttons ADD CONSTRAINT fk_template_id FOREIGN KEY (template_id) REFERENCES message_templates(id) ON DELETE CASCADE`);
            console.log('✅ Done');
        } catch (err) {
            console.log(`Failed: ${err.message}`);
        }

    } catch (err) {
        console.error('❌ Critical Error:', err.message);
    }
    process.exit();
}

fixCollationJoinCrash();
