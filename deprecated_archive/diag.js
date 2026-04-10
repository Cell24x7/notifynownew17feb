const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function test() {
    try {
        const envPath = path.join(__dirname, '.env.production');
        const envContent = fs.readFileSync(envPath, 'utf8');
        const env = {};
        envContent.split('\n').forEach(line => {
            const parts = line.split('=');
            if (parts.length >= 2) env[parts[0].trim()] = parts.slice(1).join('=').trim();
        });

        const connection = await mysql.createConnection({
            host: env.DB_HOST || 'localhost',
            user: env.DB_USER || 'root',
            password: env.DB_PASS,
            database: env.DB_NAME || 'notifynow_db'
        });

        console.log('--- User 36 Config ---');
        const [users] = await connection.execute('SELECT u.id, u.email, u.whatsapp_config_id, u.rcs_config_id FROM users u WHERE u.id = 36');
        console.log('User:', JSON.stringify(users[0], null, 2));

        if (users[0].whatsapp_config_id) {
            const [w] = await connection.execute('SELECT * FROM whatsapp_configs WHERE id = ?', [users[0].whatsapp_config_id]);
            console.log('WA Config:', JSON.stringify(w[0], null, 2));
        }

        console.log('--- Recent campaign_queue Items ---');
        const [q] = await connection.execute('SELECT id, campaign_id, mobile, status, error FROM campaign_queue WHERE id IN (650769, 650772)');
        console.log('Queue Items:', JSON.stringify(q, null, 2));

        await connection.end();
    } catch (e) {
        console.error('Error:', e.message);
    }
}

test();
