require('dotenv').config();
const { query } = require('./config/db');
const { deductCampaignCredits } = require('./services/walletService');

async function runTest() {
    console.log('🚀 Starting Custom Pricing Verification...');

    const testEmail = `test_user_${Date.now()}@example.com`;
    let userId;
    let campaignId = `TEST_CAMP_${Date.now()}`;

    try {
        // 1. Create a test user with specific prices
        const [userResult] = await query(
            `INSERT INTO users (name, email, password, role, wallet_balance, credits_available, rcs_text_price, rcs_rich_card_price, rcs_carousel_price)
       VALUES (?, ?, 'hash', 'user', 100.00, 1000, 2.50, 5.00, 10.00)`,
            ['Pricing Test User', testEmail]
        );
        userId = userResult.insertId;
        console.log(`✅ Created test user ${userId} with: Text: 2.50, Rich: 5.00, Carousel: 10.00`);

        // 2. Test Case 1: Normal Text Message Campaign (10 messages)
        // Cost should be 10 * 2.50 = 25.00
        await query(
            `INSERT INTO campaigns (id, user_id, name, channel, template_type, recipient_count, status)
       VALUES (?, ?, 'Text Campaign', 'RCS', 'standard', 10, 'running')`,
            [campaignId, userId]
        );

        console.log(`📊 Testing Text Campaign (Expected deduction: 25.00)...`);
        const res1 = await deductCampaignCredits(campaignId);
        console.log(`Result: ${res1.message}`);

        const [userAfter1] = await query('SELECT wallet_balance FROM users WHERE id = ?', [userId]);
        const balance1 = parseFloat(userAfter1[0].wallet_balance);
        console.log(`💰 New Wallet Balance: ${balance1} (Expected: 75.00)`);
        if (balance1 === 75.00) console.log('✅ TEST 1 PASSED'); else console.error('❌ TEST 1 FAILED');

        // 3. Test Case 2: Carousel Message Campaign (5 messages)
        // Previous balance 75.00. Cost: 5 * 10.00 = 50.00. New balance: 25.00
        const campaignId2 = `TEST_CAMP_2_${Date.now()}`;
        await query(
            `INSERT INTO campaigns (id, user_id, name, channel, template_type, recipient_count, status)
       VALUES (?, ?, 'Carousel Campaign', 'RCS', 'carousel', 5, 'running')`,
            [campaignId2, userId]
        );

        console.log(`📊 Testing Carousel Campaign (Expected deduction: 50.00)...`);
        const res2 = await deductCampaignCredits(campaignId2);
        console.log(`Result: ${res2.message}`);

        const [userAfter2] = await query('SELECT wallet_balance FROM users WHERE id = ?', [userId]);
        const balance2 = parseFloat(userAfter2[0].wallet_balance);
        console.log(`💰 New Wallet Balance: ${balance2} (Expected: 25.00)`);
        if (balance2 === 25.00) console.log('✅ TEST 2 PASSED'); else console.error('❌ TEST 2 FAILED');

    } catch (err) {
        console.error('❌ Test execution error:', err);
    } finally {
        // Cleanup
        if (userId) {
            await query('DELETE FROM transactions WHERE user_id = ?', [userId]);
            await query('DELETE FROM campaigns WHERE user_id = ?', [userId]);
            await query('DELETE FROM users WHERE id = ?', [userId]);
            console.log('🧹 Cleanup complete.');
        }
        process.exit(0);
    }
}

runTest();
