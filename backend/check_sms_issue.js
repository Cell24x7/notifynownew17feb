const { query } = require('./config/db');

async function checkUserAndTemplates() {
    try {
        const apiKey = 'nn_c44eaf15fad864bdcb6258bf566c39b945fe8de4006470ec';
        const [users] = await query('SELECT id, name, status, api_key FROM users WHERE api_key = ?', [apiKey]);
        console.log('USER DATA:', JSON.stringify(users, null, 2));

        if (users.length > 0) {
            const userId = users[0].id;
            const [templates] = await query('SELECT id, name, body, metadata FROM message_templates WHERE user_id = ?', [userId]);
            console.log('TEMPLATES COUNT:', templates.length);
            console.log('TEMPLATES:', JSON.stringify(templates, null, 2));

            const [gateways] = await query('SELECT * FROM sms_gateways WHERE status = "active"');
            console.log('ACTIVE GATEWAYS:', JSON.stringify(gateways, null, 2));
        } else {
            console.log('User not found for API key.');
        }
    } catch (err) {
        console.error('ERROR:', err);
    } finally {
        process.exit();
    }
}

checkUserAndTemplates();
