require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { query } = require('./config/db');

async function setup() {
    try {
        console.log('--- Setting up New Template for User 1 ---');
        const templateName = 'dynamic_otp';
        const body = 'Dear Customer, Your One Time Password is {#var#}. CMT'; // Using {#var#} for DLT
        const dltId = '1007939764982063485'; // Reusing the same DLT ID as OTP_CMT for testing
        const peId = '11015743833488'; // Example PE ID from common logs
        
        await query('INSERT INTO message_templates (user_id, name, body, metadata, status) VALUES (?, ?, ?, ?, ?)', 
            [1, templateName, body, JSON.stringify({ templateId: dltId, peId: peId }), 'approved']);
            
        console.log('✅ Template "dynamic_otp" added successfully.');
        
        // Also ensure dlt_templates has it correctly linked
        const [dlt] = await query('SELECT * FROM dlt_templates WHERE temp_name = "OTP_CMT"');
        console.log('Current DLT "OTP_CMT" record:', JSON.stringify(dlt, null, 2));

        process.exit(0);
    } catch (e) {
        console.error('Setup failed:', e.message);
        process.exit(1);
    }
}
setup();
