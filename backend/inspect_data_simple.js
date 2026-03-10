const mysql = require('mysql2');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'notifynow_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const query = (sql, params = []) => pool.promise().query(sql, params);

async function check() {
    try {
        const [configs] = await query('SELECT id, ph_no_id, wa_biz_accnt_id FROM whatsapp_configs');
        console.log('WhatsApp Configs:', configs);

        const [users] = await query('SELECT id, name, whatsapp_config_id FROM users');
        console.log('Users:', users);

        const [logs] = await query('SELECT * FROM webhook_logs WHERE type = "whatsapp" ORDER BY created_at DESC LIMIT 5');
        console.log('Recent WA Webhook Logs:', logs);

        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

check();
