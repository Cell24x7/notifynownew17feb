const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
dotenv.config({ path: path.join(__dirname, envFile) });

const { query } = require('./config/db');

async function checkTables() {
    try {
        console.log('🔍 Checking Support System Tables...');
        
        const tables = ['tickets', 'ticket_replies', 'ticket_attachments'];
        
        for (const table of tables) {
            try {
                const [rows] = await query(`SHOW TABLES LIKE '${table}'`);
                if (rows.length > 0) {
                    console.log(`✅ Table '${table}' exists.`);
                } else {
                    console.log(`❌ Table '${table}' is MISSING!`);
                }
            } catch (e) {
                console.log(`❌ Error checking '${table}':`, e.message);
            }
        }

        const [userCols] = await query('DESCRIBE users');
        const hasDept = userCols.find(c => c.Field === 'department');
        console.log(hasDept ? "✅ 'department' column found in users." : "❌ 'department' column is MISSING in users.");

        process.exit(0);
    } catch (err) {
        console.error('Fatal Error:', err.message);
        process.exit(1);
    }
}

checkTables();
