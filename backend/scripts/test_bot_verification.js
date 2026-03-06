require('dotenv').config();
const axios = require('axios');
const mysql = require('mysql2/promise');

async function testSubmission() {
    console.log('🧪 Starting Bot Submission Verification Test...');

    // Mock user ID (replace with a real one from your DB for a real test)
    const userId = 7;
    const API_URL = 'http://localhost:5000/api/bots';

    const testData = {
        data: {
            bot: {
                privacy_url: 'https://example.com/privacy',
                term_and_condition_url: 'https://example.com/terms',
                platform: 'GSMA API',
                phone_list: [{ value: '+919999999999', label: 'Support' }],
                email_list: [{ value: 'support@example.com', label: 'Support' }],
                website_list: [{ value: 'https://example.com', label: 'Website' }]
            },
            rcs_bot: {
                lang_supported: 'English',
                agent_msg_type: 'Promotional',
                billing_category: 'Non_Conversational',
                webhook_url: 'https://example.com/webhook'
            },
            bot_desc: [{ bot_name: 'Test Bot', bot_summary: 'This is a test bot' }],
            agent_color: '#000000'
        },
        brand_details: {
            brand_name: 'Test Brand',
            brand_address: 'Test City, Test State, India',
            brand_industry: 'Telecom'
        },
        carrier_details: { carrier_list: [97, 77, 98], global_reach: false },
        region: 'India'
    };

    // Note: In a real test, we'd send FormData. Here we're just checking if the route exists and handles the logic.
    // Since we can't easily mock the Dotgo API call from within the route without changing code, 
    // we'll just verify the backend can handle the database part.

    console.log('ℹ️ Verifying backend persistence logic...');
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME
        });

        // Check if we can insert into rcs_bot_master with the new columns
        const [result] = await connection.query(
            `INSERT INTO rcs_bot_master (
                user_id, brand_id, bot_id, brand_name, brand_address, brand_industry, 
                bot_name, short_description, 
                route_type, bot_type, message_type, status,
                webhook_url, languages_supported, bot_logo_url, banner_image_url,
                terms_url, privacy_url
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'TEST_SUBMITTED', ?, ?, ?, ?, ?, ?)`,
            [
                userId, 'TEST_BRAND_ID', 'TEST_BOT_ID', 'Test Brand', 'Test Address', 'Telecom',
                'Test Bot', 'Test Summary', 'DOMESTIC', 'DOMESTIC', 'Promotional',
                'https://test.webhook', 'English', 'http://localhost/logo.png', 'http://localhost/banner.png',
                'https://example.com/terms', 'https://example.com/privacy'
            ]
        );

        console.log('✅ Database insertion test PASSED. Column terms_url and privacy_url are working.');

        // Clean up
        await connection.execute('DELETE FROM rcs_bot_master WHERE id = ?', [result.insertId]);
        console.log('🧹 Test data cleaned up.');
        await connection.end();
    } catch (err) {
        console.error('❌ Database test FAILED:', err.message);
    }
}

testSubmission();
