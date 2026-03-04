require('dotenv').config();
const { query } = require('./config/db');

const fs = require('fs');

async function getSchemas() {
    const tables = ['users', 'message_templates', 'campaigns', 'campaign_queue'];
    const schema = {};
    for (const table of tables) {
        const [rows] = await query(`DESCRIBE ${table}`);
        schema[table] = rows;
    }
    fs.writeFileSync('schemas.json', JSON.stringify(schema, null, 2));
    process.exit(0);
}

getSchemas().catch(err => {
    console.error(err);
    process.exit(1);
});
