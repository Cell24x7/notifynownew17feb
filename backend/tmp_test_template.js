require('dotenv').config({path: './.env'});
const { query } = require('./config/db');

async function check() {
    try {
        const [users] = await query('SELECT * FROM users WHERE id = 1');
        if (users.length) {
            const configId = users[0].whatsapp_config_id;
            const [configs] = await query('SELECT * FROM whatsapp_configs WHERE id = ?', [configId]);
            console.log("Config:", JSON.stringify(configs[0], null, 2));
        }
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

check();
