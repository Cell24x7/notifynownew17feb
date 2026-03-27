require('dotenv').config({ path: './backend/.env' });
const { query, closePool } = require('./backend/config/db');

async function checkUser() {
  try {
    const [rows] = await query('SELECT id, name, email, role, permissions, plan_id FROM users WHERE name LIKE ? OR email LIKE ?', ['%demo%', '%demo%']);
    console.log("USER DATA:");
    console.log(JSON.stringify(rows, null, 2));
    
    if (rows.length > 0 && rows[0].plan_id) {
       const [plan] = await query('SELECT id, name, permissions FROM plans WHERE id = ?', [rows[0].plan_id]);
       console.log("PLAN PERMISSIONS:");
       console.log(JSON.stringify(plan, null, 2));
    }
  } catch (err) {
    console.error(err);
  } finally {
    const { pool } = require('./backend/config/db');
    if (pool) pool.end();
  }
}

checkUser();
