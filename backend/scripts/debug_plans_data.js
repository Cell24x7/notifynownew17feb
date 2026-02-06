import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function debugPlans() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT
        });

        console.log('Connected.');

        const [rows] = await connection.query('SELECT id, name, channels_allowed, HEX(channels_allowed) as hex_val FROM plans');

        console.log('--- Raw Plans Data ---');
        rows.forEach(r => {
            console.log(`Plan: ${r.name}`);
            console.log(`Type of channels_allowed: ${typeof r.channels_allowed}`);
            console.log(`Value:`, r.channels_allowed);
            console.log(`Is Array? ${Array.isArray(r.channels_allowed)}`);
            console.log('---');
        });

        await connection.end();
    } catch (err) {
        console.error(err);
    }
}

debugPlans();
