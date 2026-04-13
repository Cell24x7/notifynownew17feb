const { query } = require('./config/db');
require('dotenv').config({ path: './.env' });

async function checkReseller() {
  try {
    const [rows] = await query('SELECT id, brand_name, domain, status, email FROM resellers WHERE id = 12 OR email LIKE "%alienics%"');
    console.log('RESELLER DATA:', JSON.stringify(rows, null, 2));
  } catch (err) {
    console.error('ERROR:', err);
  } finally {
    process.exit();
  }
}

checkReseller();
