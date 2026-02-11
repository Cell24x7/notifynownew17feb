const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const checkInterval = 5000; // 5 seconds
const seenIds = new Set();

const monitorTemplates = async () => {
    console.log('👀 Monitoring `message_templates` for new entries...');

    // Load initial IDs to avoid alerting on existing ones
    try {
        const [initialRows] = await pool.query('SELECT id FROM message_templates');
        initialRows.forEach(row => seenIds.add(row.id));
        console.log(`✅ Loaded ${seenIds.size} existing templates.`);
    } catch (err) {
        console.error('❌ Error loading initial templates:', err.message);
    }

    setInterval(async () => {
        try {
            const [rows] = await pool.query('SELECT * FROM message_templates ORDER BY created_at DESC LIMIT 5');

            rows.forEach(row => {
                if (!seenIds.has(row.id)) {
                    console.log('\n🆕 NEW TEMPLATE DETECTED!');
                    console.log('------------------------------------------------');
                    console.log(`ID: ${row.id}`);
                    console.log(`Name: ${row.name}`);
                    console.log(`Type: ${row.template_type}`);
                    console.log(`Channel: ${row.channel}`);
                    console.log(`Status: ${row.status}`);
                    console.log(`Created At: ${row.created_at}`);
                    console.log('------------------------------------------------\n');
                    seenIds.add(row.id);
                }
            });
        } catch (error) {
            console.error('❌ Monitoring Error:', error.message);
        }
    }, checkInterval);
};

monitorTemplates();
