const mysql = require('mysql2');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10
});

pool.getConnection((err, conn) => {
  if (err) {
    console.error('❌ DB Connection Failed:', err.message);
    process.exit(1);
  }
  console.log('✅ MySQL Connected');
  conn.release();
});

module.exports = {
  query: (sql, params = []) => pool.promise().query(sql, params)
};