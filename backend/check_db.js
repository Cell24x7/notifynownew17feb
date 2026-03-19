const { query } = require('./config/db');

async function check() {
  try {
    const [rows] = await query('DESCRIBE users');
    console.log(JSON.stringify(rows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
