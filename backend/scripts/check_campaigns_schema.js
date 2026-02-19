const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { query } = require('../config/db');

const checkSchema = async () => {
    try {
        const result = await query('SHOW COLUMNS FROM campaigns');
        console.log('✅ Table campaigns columns:');
        result[0].forEach(col => console.log(` - ${col.Field} (${col.Type})`));
        process.exit(0);
    } catch (error) {
        console.error('❌ Error checking schema:', error.message);
        process.exit(1);
    }
};

checkSchema();
