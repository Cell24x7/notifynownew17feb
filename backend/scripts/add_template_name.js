const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { query } = require('../config/db');

(async () => {
    try {
        console.log('--- Adding template_name column to campaigns ---');

        // Check if column exists
        const [columns] = await query('SHOW COLUMNS FROM campaigns LIKE "template_name"');
        if (columns.length > 0) {
            console.log('Column template_name already exists through migration.');
        } else {
            await query('ALTER TABLE campaigns ADD COLUMN template_name VARCHAR(255) AFTER template_id');
            console.log('✅ Column template_name added successfully.');
        }

        process.exit();
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
})();
