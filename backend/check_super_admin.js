const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'c:/SandeepYadav/NotifyProject/notifynownew17feb/backend/.env' });

async function checkUser() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
  });

  try {
    const [rows] = await connection.execute('SELECT * FROM users WHERE email = ?', ['Sandy@gmail.com']);
    console.log(JSON.stringify(rows, null, 2));
  } catch (error) {
    console.error(error);
  } finally {
    await connection.end();
  }
}

checkUser();
