require('dotenv').config({ path: __dirname + '/../.env' });
const db = require('../config/db');

async function run() {
  try {
    const [cRows] = await db.query("DESCRIBE link_clicks");
    console.log("link_clicks:", cRows);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
run();
