const fs = require('fs');
const envPath = fs.existsSync(__dirname + '/../.env.production') 
  ? __dirname + '/../.env.production' 
  : __dirname + '/../.env';
require('dotenv').config({ path: envPath });
const mysql = require('mysql2/promise');

async function deleteUser() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
  });

  const email = 'autochatix@gmail.com';
  console.log(`Attempting to delete orphaned account: ${email}`);

  try {
    const [result] = await pool.query('DELETE FROM users WHERE email = ?', [email]);
    if (result.affectedRows > 0) {
      console.log(`✅ Success: ${email} has been permanently deleted from the users table.`);
    } else {
      console.log(`⚠️ Note: ${email} was not found in the users table. It might have been deleted already.`);
    }

    const [resellerResult] = await pool.query('DELETE FROM resellers WHERE email = ?', [email]);
    if (resellerResult.affectedRows > 0) {
      console.log(`✅ Success: ${email} was also removed from the resellers table.`);
    }

  } catch (err) {
    console.error('❌ Error while deleting:', err.message);
  } finally {
    await pool.end();
  }
}

deleteUser();
