const { query } = require('./config/db');
require('dotenv').config({ path: './.env.production' });

async function debugPricing() {
    try {
        console.log('🔍 Checking otp template category...');
        const [templates] = await query('SELECT name, category FROM message_templates WHERE name = "otp"');
        console.log('Templates:', JSON.stringify(templates, null, 2));

        console.log('\n🔍 Checking user sms pricing (User ID: 1)...');
        const [users] = await query(
            'SELECT id, sms_promotional_price, sms_transactional_price, sms_service_price FROM users WHERE id = 1'
        );
        console.log('User Pricing:', JSON.stringify(users, null, 2));

        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

debugPricing();
