require('dotenv').config();
const { query } = require('../config/db');

async function test() {
    try {
        const [tables] = await query('SHOW TABLES');
        for (let row of tables) {
            const tableName = Object.values(row)[0];
            const [countRow] = await query(`SELECT COUNT(*) as count FROM ${tableName}`);
            if (countRow[0].count > 0) {
                console.log(`${tableName}: ${countRow[0].count} rows`);
            }
        }
    } catch (e) {
        console.error('DB TEST ERROR:', e.message);
    } finally {
        process.exit();
    }
}

test();
