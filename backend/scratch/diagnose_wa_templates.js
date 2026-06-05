const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const axios = require('axios');
const path = require('path');

// Load production environment configuration
dotenv.config({ path: path.join(__dirname, '..', '.env.production') });

(async () => {
  let connection;
  try {
    console.log('Connecting to database:', process.env.DB_NAME, 'on', process.env.DB_HOST);
    let connectionOptions = {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || '',
      database: process.env.DB_NAME || 'notifynow_db'
    };
    try {
      connection = await mysql.createConnection(connectionOptions);
    } catch (connErr) {
      if (connErr.code === 'ER_ACCESS_DENIED_ERROR') {
        console.log('Access denied, trying local fallback password root123...');
        connectionOptions.password = 'root123';
        connection = await mysql.createConnection(connectionOptions);
      } else {
        throw connErr;
      }
    }
    
    // Query users with whatsapp_config_id
    const [users] = await connection.execute(
      'SELECT id, name, email, whatsapp_config_id, channels_enabled FROM users'
    );
    console.log(`\n=== USERS SUMMARY (Total ${users.length}) ===`);
    const usersWithConfig = users.filter(u => u.whatsapp_config_id);
    console.log(`Users with whatsapp_config_id set: ${usersWithConfig.length}`);
    console.log(usersWithConfig.map(u => ({ id: u.id, name: u.name, email: u.email, whatsapp_config_id: u.whatsapp_config_id })));
    
    // Query all configs
    const [configs] = await connection.execute(
      'SELECT * FROM whatsapp_configs'
    );
    console.log(`\n=== WHATSAPP CONFIGS (Total ${configs.length}) ===`);
    console.log(configs.map(c => ({
      id: c.id, 
      chatbot_name: c.chatbot_name, 
      provider: c.provider, 
      is_active: c.is_active, 
      wanumber: c.wanumber,
      wa_biz_accnt_id: c.wa_biz_accnt_id,
      ph_no_id: c.ph_no_id,
      has_token: !!c.wa_token,
      has_apikey: !!c.api_key
    })));
    
    // Try to query templates for active configs
    for (const config of configs) {
      console.log(`\n--- Testing Config ID ${config.id} (${config.chatbot_name}) ---`);
      console.log(`Provider: ${config.provider}, active: ${config.is_active}`);
      
      const isPinbot = config.provider === 'vendor2';
      const headers = isPinbot 
        ? { apikey: config.api_key, 'Content-Type': 'application/json' }
        : { Authorization: `Bearer ${config.wa_token}`, 'Content-Type': 'application/json' };
        
      const url = isPinbot 
        ? `https://partnersv1.pinbot.ai/v3/${config.wa_biz_accnt_id}/message_templates`
        : `https://graph.facebook.com/v19.0/${config.wa_biz_accnt_id}/message_templates`;
        
      console.log(`Calling API URL: ${url}`);
      try {
        const response = await axios.get(url, { headers, timeout: 10000 });
        const templates = response.data.data || response.data || [];
        console.log(`✅ SUCCESS! Fetched ${templates.length} templates.`);
        if (templates.length > 0) {
          console.log(`First template name: ${templates[0].name}, status: ${templates[0].status}`);
        }
      } catch (apiErr) {
        console.error(`❌ API CALL FAILED for Config ID ${config.id}:`, apiErr.response ? JSON.stringify(apiErr.response.data) : apiErr.message);
      }
    }
    
  } catch (err) {
    console.error('Fatal error:', err);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
})();
