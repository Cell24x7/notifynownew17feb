require('dotenv').config();
const { query } = require('./config/db');

async function debug() {
    try {
        console.log('Checking tables...');
        const [tables] = await query('SHOW TABLES');
        console.log('Tables in database:', tables.map(t => Object.values(t)[0]));

        const tablesToCheck = ['chat_flows', 'whatsapp_configs', 'users'];
        for (const table of tablesToCheck) {
            try {
                const [schema] = await query(`DESCRIBE ${table}`);
                console.log(`\nSchema for ${table}:`);
                console.table(schema);
            } catch (err) {
                console.error(`\n❌ Table ${table} does not exist or error:`, err.message);
            }
        }
    } catch (err) {
        console.error('❌ Database debug failed:', err.message);
    } finally {
        process.exit();
    }
}

debug();
