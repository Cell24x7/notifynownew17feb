const { query } = require('./config/db');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

async function test() { 
    try { 
        const [cols1] = await query('SHOW COLUMNS FROM api_campaigns'); 
        const [cols2] = await query('SHOW COLUMNS FROM api_message_logs'); 
        console.log('api_campaigns:', cols1.map(c=>c.Field).join(', ')); 
        console.log('api_message_logs:', cols2.map(c=>c.Field).join(', ')); 
    } catch (e) { 
        console.log('Error:', e); 
    } 
    process.exit(0); 
} 
test();
