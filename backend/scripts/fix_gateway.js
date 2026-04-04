const path = require('path');
const dotenv = require('dotenv');
// Load from ONE level up since we're in backend/scripts
dotenv.config({ path: path.join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');

async function fixGateway() {
    let pool;
    try {
        console.log('🔗 Connecting to database:', process.env.DB_NAME);
        pool = mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });

        // 1. Update Sender ID to CMTLTD for JIO
        const [res] = await pool.query('UPDATE sms_gateways SET sender_id = ? WHERE name = ?', ['CMTLTD', 'JIO']);
        console.log(`✅ [Gateway] Updated JIO sender_id to CMTLTD (${res.affectedRows} rows affected)`);

        console.log('🚀 Gateway synchronization complete!');
    } catch (err) {
        console.error('❌ Error fixing gateway:', err.message);
    } finally {
        if (pool) await pool.end();
        process.exit();
    }
}

fixGateway();
