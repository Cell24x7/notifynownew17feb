require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { query } = require('../config/db');

async function testLogic() {
    try {
        const from = "";
        const to = "";
        const channel = "all";
        const status = "all";

        let conditions = ["1=1"];
        let params = [];

        if (from) {
            conditions.push("c.created_at >= ?");
            params.push(from + ' 00:00:00');
        }
        if (to) {
            conditions.push("c.created_at <= ?");
            params.push(to + ' 23:59:59');
        }
        if (channel && channel !== 'all') {
            conditions.push("c.channel = ?");
            params.push(channel);
        }
        if (status && status !== 'all') {
            conditions.push("c.status = ?");
            params.push(status);
        }

        const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
        console.log("WHERE:", whereClause);
        console.log("PARAMS:", params);

        const sql = `
            SELECT 
                c.id, c.name, c.channel, c.status, c.created_at
            FROM campaigns c
            LEFT JOIN users u ON c.user_id = u.id
            ${whereClause}
            ORDER BY c.created_at DESC
            LIMIT 10
        `;

        const [rows] = await query(sql, params);
        console.log('Rows returned:', rows.length);
        if (rows.length > 0) console.log('First row:', rows[0]);

    } catch (error) {
        console.error('Error:', error);
    }
    process.exit();
}

testLogic();
