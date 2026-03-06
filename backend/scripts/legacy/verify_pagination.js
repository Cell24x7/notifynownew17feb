const axios = require('axios');
require('dotenv').config();

const API_BASE_URL = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
const TOKEN = 'YOUR_TEST_TOKEN';

async function testPagination() {
    try {
        console.log(`Testing RCS Reports Pagination at ${API_BASE_URL}/api...`);
        // This might fail if I don't have a valid user token, but I can check the code logic.
    } catch (error) {
        console.error('Test failed:', error.message);
    }
}

testPagination();
