require('dotenv').config();
const mysql = require('mysql2/promise');

async function createTableAndColumn() {
    console.log("Connecting to database...");
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || process.env.DB_PASS || '',
        database: process.env.DB_NAME || 'notifynow_db',
    });

    try {
        console.log("Ensuring sms_gateways table exists...");
        await connection.query(`
            CREATE TABLE IF NOT EXISTS sms_gateways (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                primary_url TEXT NOT NULL,
                secondary_url TEXT,
                status ENUM('active','inactive') DEFAULT 'active',
                routing ENUM('national','international','both') DEFAULT 'national',
                priority ENUM('non-otp','otp','both') DEFAULT 'both',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log("✅ sms_gateways table is ready.");

        console.log("Checking if sms_gateway_id column exists in users table...");
        const [columns] = await connection.query(`SHOW COLUMNS FROM users LIKE 'sms_gateway_id'`);
        if (columns.length === 0) {
            console.log("Adding sms_gateway_id column to users table...");
            await connection.query(`ALTER TABLE users ADD COLUMN sms_gateway_id INT DEFAULT NULL`);
            await connection.query(`ALTER TABLE users ADD CONSTRAINT fk_sms_gateway FOREIGN KEY (sms_gateway_id) REFERENCES sms_gateways(id) ON DELETE SET NULL`);
            console.log("✅ sms_gateway_id column added.");
        } else {
            console.log("✅ sms_gateway_id column already exists.");
        }

        console.log("Done successfully!");
    } catch (err) {
        console.error("❌ Database Error: ", err.message);
    } finally {
        await connection.end();
        process.exit();
    }
}

createTableAndColumn();
