
const { query } = require('./config/db');
require('dotenv').config();

async function checkFlows() {
  const [rows] = await query("SELECT id, name, keywords FROM chat_flows WHERE user_id = 34 AND status = 'active'");
  rows.forEach(row => {
    console.log(`ID: ${row.id} | Name: ${row.name} | Keywords: ${row.keywords}`);
  });
  process.exit(0);
}

checkFlows();
