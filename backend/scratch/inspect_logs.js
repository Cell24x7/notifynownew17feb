const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env.production') });
console.log("Loaded DB_HOST:", process.env.DB_HOST);
console.log("Loaded DB_NAME:", process.env.DB_NAME);

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

    console.log("Connecting with user:", connectionOptions.user, "password:", connectionOptions.password ? "YES" : "NO");
    connection = await mysql.createConnection(connectionOptions);

    console.log("✅ Connected to Production DB!");

    // Query latest 20 logs from api_message_logs where channel is WhatsApp Unofficial
    const [rows] = await connection.execute(
      `SELECT id, campaign_id, campaign_name, recipient, status, send_time, delivery_time, read_time, failure_reason, channel, message_id 
       FROM api_message_logs 
       WHERE channel LIKE '%Unofficial%'
       ORDER BY id DESC LIMIT 50`
    );

    console.log(`\n=== LATEST 50 API MESSAGE LOGS (WhatsApp Unofficial) ===`);
    console.table(rows.map(r => ({
      id: r.id,
      campId: r.campaign_id,
      name: r.campaign_name?.substring(0, 40),
      phone: r.recipient,
      status: r.status,
      send: r.send_time,
      del: r.delivery_time,
      read: r.read_time,
      msgId: r.message_id
    })));

    // Query latest 20 webhook logs
    const [webhookLogs] = await connection.execute(
      `SELECT id, sender, recipient, message_id, status, type, created_at 
       FROM webhook_logs 
       ORDER BY id DESC LIMIT 20`
    );
    console.log(`\n=== LATEST 20 WEBHOOK LOGS ===`);
    console.table(webhookLogs);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    if (connection) await connection.end();
    process.exit(0);
  }
})();
