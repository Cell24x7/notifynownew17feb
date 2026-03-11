const { query } = require('./config/db');

async function check() {
    try {
        const rows = await query('DESCRIBE campaigns');
        console.log(JSON.stringify(rows, null, 2));
    } catch (err) {
        console.error(err);
    }
}
check();
