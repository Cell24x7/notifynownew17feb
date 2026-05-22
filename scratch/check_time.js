const { query } = require('../backend/config/db');

async function test() {
    try {
        const [rows] = await query(`
            SELECT id, name, status, 
                   next_run_at, 
                   CAST(next_run_at AS CHAR) as next_run_at_str,
                   scheduled_at,
                   CAST(scheduled_at AS CHAR) as scheduled_at_str
            FROM campaigns 
            WHERE id IN ('CAMP1779440449520', 'CAMP1779440675507', 'CAMP1779440852759', 'CAMP1779441285545', 'CAMP1779441505832')
        `);
        console.log('Campaigns in DB:');
        console.log(JSON.stringify(rows, null, 2));
        
        const [now] = await query('SELECT NOW() as db_now, CAST(NOW() AS CHAR) as db_now_str');
        console.log('MySQL NOW():', now[0]);
        
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

test();
