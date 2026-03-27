require('dotenv').config();
const { query } = require('./config/db');

async function checkUser() {
  try {
    const [rows] = await query('SELECT id, name, email, role, permissions, plan_id FROM users WHERE id = 1');
    console.log("USER 1 PERMISSIONS TYPE:", typeof rows[0].permissions);
    console.log("USER 1 PERMISSIONS VALUE:", rows[0].permissions);
    
    if (rows[0].plan_id) {
       const [plan] = await query('SELECT id, name, permissions FROM plans WHERE id = ?', [rows[0].plan_id]);
       console.log("PLAN PERMISSIONS TYPE:", typeof plan[0].permissions);
       console.log("PLAN PERMISSIONS VALUE:", plan[0].permissions);
    }
  } catch (err) {
    console.error(err);
  } finally {
    const { pool } = require('./config/db');
    if (pool) pool.end();
  }
}

checkUser();
