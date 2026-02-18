const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { query } = require('../config/db');

async function checkColumns() {
    try {
        const [columns] = await query("SHOW COLUMNS FROM campaigns");
        console.log("Columns in campaigns table:");
        columns.forEach(col => console.log(`- ${col.Field} (${col.Type})`));
        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

checkColumns();
