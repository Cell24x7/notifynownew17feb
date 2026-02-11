const axios = require('axios');

const API_URL = 'http://localhost:5000/api/rcs-templates/templates';

const testCreateTemplate = async () => {
    try {
        console.log('🚀 Testing Template Creation via API...');

        const payload = {
            name: `Test_Template_${Date.now()}`,
            template_type: 'text_message',
            body: 'This is a test message from verification script',
            status: 'pending_approval',
            created_by: 'script_test'
        };

        const response = await axios.post(API_URL, payload);

        console.log('✅ Template Created Successfully!');
        console.log('Response:', response.data);
    } catch (error) {
        console.error('❌ Creation Failed:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data));
        }
    }
};

testCreateTemplate();
