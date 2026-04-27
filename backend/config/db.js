const mysql = require('mysql2');

// Validate essential env vars to prevent silent failures
if (!process.env.DB_HOST || !process.env.DB_USER) {
  console.error("⚠️ WARNING: DB_HOST or DB_USER Env variables are missing.");
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 100, // Reduced from 600 to 100 to prevent ER_CON_COUNT_ERROR on smaller servers
  queueLimit: 0,
  connectTimeout: 10000 // 10s wait for DB
});

// Global error holder for debugging
let dbConnectionError = null;

pool.getConnection((err, conn) => {
  if (err) {
    console.error(`❌ DB Connection Failed [${process.env.DB_NAME}]:`, err.message);
    dbConnectionError = err.message;
  } else {
    // console.log(`✅ MySQL Connected to Database: ${process.env.DB_NAME}`);
    conn.release();
  }
});

module.exports = {
  pool,
  query: (sql, params = []) => pool.promise().query(sql, params),
  getDbError: () => dbConnectionError
};

