const { query } = require('./config/db');
require('dotenv').config();

async function checkUser() {
    try {
        const [users] = await query('SELECT * FROM users WHERE email = ?', ['dhanlaxmi@gmail.com']);
        if (users.length === 0) {
            console.log('User not found');
            process.exit(0);
        }
        const user = users[0];
        console.log('User Data:', {
            id: user.id,
            email: user.email,
            wallet_balance: user.wallet_balance,
            wa_marketing_price: user.wa_marketing_price,
            wa_utility_price: user.wa_utility_price,
            wa_authentication_price: user.wa_authentication_price
        });
        
        const [campaigns] = await query('SELECT * FROM campaigns WHERE user_id = ? ORDER BY created_at DESC LIMIT 1', [user.id]);
        if (campaigns.length > 0) {
            console.log('Latest Campaign:', {
                id: campaigns[0].id,
                channel: campaigns[0].channel,
                status: campaigns[0].status,
                recipient_count: campaigns[0].recipient_count,
                audience_count: campaigns[0].audience_count,
                credits_deducted: campaigns[0].credits_deducted
            });
        }
        
        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

checkUser();
