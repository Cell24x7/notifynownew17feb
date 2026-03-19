require('dotenv').config({path: '.env.production'});
const mysql = require('mysql2/promise');
async function f() {
  const c = await mysql.createConnection({host:'localhost', user:'root', password:'waQ4!r1241Kr', database:'notifynow_db'});
  const [rows] = await c.query('DESCRIBE message_logs');
  console.log(JSON.stringify(rows, null, 2));
  process.exit(0);
}
f();
