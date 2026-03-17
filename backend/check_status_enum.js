const { query } = require('./config/db');

async function check() {
    try {
        const [rows] = await query("SHOW COLUMNS FROM campaigns LIKE 'status'");
        if (rows.length > 0) {
            console.log(`Column 'status' Type: ${rows[0].Type}`);
        } else {
            console.log("Column 'status' not found.");
        }
    } catch (err) {
        console.error('Check Error:', err.message);
    } finally {
        process.exit();
    }
}

check();
