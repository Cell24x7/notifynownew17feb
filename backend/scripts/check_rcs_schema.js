const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { query } = require('../config/db');

const checkSchema = async () => {
    try {
        console.log('🔍 Checking rcs_templates schema...');
        const [columns] = await query('DESCRIBE rcs_templates');
        columns.forEach(col => {
            console.log(`${col.Field}: ${col.Type} (Default: ${col.Default}, Null: ${col.Null})`);
        });
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
};

checkSchema();
