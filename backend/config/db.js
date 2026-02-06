const mysql = require('mysql2');

// Validate essential env vars to prevent silent failures
if (!process.env.DB_HOST || !process.env.DB_USER) {
  console.error("⚠️ WARNING: DB_HOST or DB_USER Env variables are missing.");
}

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Global error holder for debugging
let dbConnectionError = null;

pool.getConnection((err, conn) => {
  if (err) {
    console.error('❌ DB Connection Failed:', err.message);
    dbConnectionError = err.message;
    // Do NOT exit process, so we can show error on API root
    // process.exit(1); 
  } else {
    console.log('✅ MySQL Connected');
    conn.release();
  }
});

module.exports = {
  query: (sql, params = []) => pool.promise().query(sql, params),
  getDbError: () => dbConnectionError
};

