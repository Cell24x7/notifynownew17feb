const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const mysql = require('mysql2/promise');

(async () => {
  let connection;
  try {
    let connectionOptions = {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || '',
      database: process.env.DB_NAME || 'notifynow_db'
    };

    try {
      connection = await mysql.createConnection(connectionOptions);
    } catch (connErr) {
      connectionOptions.password = 'root123';
      connection = await mysql.createConnection(connectionOptions);
    }

    console.log("✅ Connected!");

    const [triggers] = await connection.query('SHOW TRIGGERS');
    console.log("=== TRIGGERS IN DB ===");
    console.log(triggers);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    if (connection) await connection.end();
    process.exit(0);
  }
})();
