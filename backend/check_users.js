const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

(async () => {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'root123',
      database: process.env.DB_NAME || 'notifynow_db'
    });
    
    const [users] = await connection.execute('SELECT id, name, email, role, permissions FROM users WHERE (email IN ("shyam@cell24x7.com", "demo@cell24x7.com") OR name LIKE "%shyam%" OR name LIKE "%demo%") LIMIT 10');
    console.log('USERS DATA:');
    console.log(JSON.stringify(users, null, 2));

    const [resellers] = await connection.execute('SELECT id, name, email, permissions FROM resellers WHERE (email IN ("shyam@cell24x7.com", "demo@cell24x7.com") OR name LIKE "%shyam%" OR name LIKE "%demo%") LIMIT 10');
    console.log('RESELLERS DATA:');
    console.log(JSON.stringify(resellers, null, 2));

    await connection.end();
  } catch (e) {
    console.error(e);
  }
})();
