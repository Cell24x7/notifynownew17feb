const { query } = require('./config/db');
async function run() {
  try {
    const [columns] = await query('DESCRIBE campaigns');
    console.log('--- campaigns table schema ---');
    console.table(columns);
    const [columns2] = await query('DESCRIBE message_templates');
    console.log('--- message_templates table schema ---');
    console.table(columns2);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
