const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const axios = require('axios');
const path = require('path');

// Load local environment configuration
dotenv.config({ path: path.join(__dirname, '..', '.env') });
if (!process.env.DB_HOST) {
  dotenv.config({ path: path.join(__dirname, '..', '.env.production') });
}

(async () => {
  let connection;
  try {
    console.log('Connecting to database:', process.env.DB_NAME, 'on', process.env.DB_HOST);
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASS !== undefined ? process.env.DB_PASS : '',
      database: process.env.DB_NAME || 'notifynow_db'
    });
    
    // Query users with whatsapp_config_id
    const [users] = await connection.execute(
      'SELECT id, name, email, whatsapp_config_id, channels_enabled FROM users WHERE whatsapp_config_id IS NOT NULL AND whatsapp_config_id != 0'
    );
    console.log(`Found ${users.length} users with whatsapp_config_id set:`);
    console.log(users.map(u => ({ id: u.id, name: u.name, email: u.email, whatsapp_config_id: u.whatsapp_config_id, channels: u.channels_enabled })));
    
    if (users.length === 0) {
      console.log('No users have whatsapp_config_id configured!');
    } else {
      // Query their configs
      const configIds = users.map(u => u.whatsapp_config_id);
      const [configs] = await connection.execute(
        `SELECT * FROM whatsapp_configs WHERE id IN (${configIds.join(',')})`
      );
      console.log(`Found ${configs.length} configurations in whatsapp_configs:`);
      console.log(configs.map(c => ({ id: c.id, chatbot_name: c.chatbot_name, provider: c.provider, is_active: c.is_active, wa_biz_accnt_id: c.wa_biz_accnt_id })));
      
      // Try to query templates for the first user/config
      for (const config of configs) {
        console.log(`\nTesting Config ID ${config.id} (provider: ${config.provider}, active: ${config.is_active})...`);
        if (!config.is_active) {
          console.log(`Config ${config.id} is inactive, skipping API test.`);
          continue;
        }
        
        const isPinbot = config.provider === 'vendor2';
        const headers = isPinbot 
          ? { apikey: config.api_key, 'Content-Type': 'application/json' }
          : { Authorization: `Bearer ${config.wa_token}`, 'Content-Type': 'application/json' };
          
        const url = isPinbot 
          ? `https://partnersv1.pinbot.ai/v3/${config.wa_biz_accnt_id}/message_templates`
          : `https://graph.facebook.com/v19.0/${config.wa_biz_accnt_id}/message_templates`;
          
        console.log(`Calling URL: ${url}`);
        console.log(`Headers key preview: ${isPinbot ? 'apikey: ' + (config.api_key ? config.api_key.substring(0, 10) + '...' : 'null') : 'Bearer ' + (config.wa_token ? config.wa_token.substring(0, 15) + '...' : 'null')}`);
        
        try {
          const response = await axios.get(url, { headers, timeout: 10000 });
          const data = response.data;
          const templates = data.data || data || [];
          console.log(`✅ Success! Fetched ${templates.length} templates.`);
          if (templates.length > 0) {
            console.log('First template preview:', JSON.stringify(templates[0], null, 2));
          }
        } catch (apiErr) {
          console.error(`❌ API call failed:`, apiErr.response ? apiErr.response.data : apiErr.message);
        }
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
