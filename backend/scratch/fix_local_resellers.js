const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function run() {
    console.log("Checking database resellers table status...");
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME
    });

    try {
        const [res] = await conn.query("SHOW VARIABLES LIKE 'datadir'");
        console.log("MySQL DataDir:", res);
        const dataDir = res[0].Value;
        const dbName = process.env.DB_NAME;
        const targetIbdFile = path.join(dataDir, dbName, 'resellers.ibd');
        console.log("Target IBD File:", targetIbdFile);

        try {
            const [rows] = await conn.query("SELECT * FROM resellers LIMIT 1");
            console.log("Resellers table is readable. Row count check:", rows.length);
        } catch (e) {
            console.error("Resellers table query failed:", e.message);

            if (e.message.includes("exist") || e.message.includes("Tablespace") || e.message.includes("DISCARD")) {
                console.log("Dropping table if exists...");
                await conn.query("DROP TABLE IF EXISTS resellers");
                
                // If the ibd file exists, try to delete it!
                if (fs.existsSync(targetIbdFile)) {
                    console.log(`lingering ibd file exists at ${targetIbdFile}. Trying to delete...`);
                    try {
                        fs.unlinkSync(targetIbdFile);
                        console.log("Deleted ibd file successfully!");
                    } catch (err) {
                        console.error("Could not delete ibd file via node fs (requires admin/permission):", err.message);
                    }
                } else {
                    console.log("No ibd file found at path via fs module.");
                }

                console.log("Re-creating resellers table...");
                const createTableSql = `
                    CREATE TABLE resellers (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        name VARCHAR(255) NOT NULL,
                        email VARCHAR(255) UNIQUE NOT NULL,
                        phone VARCHAR(20) NULL,
                        domain VARCHAR(255) NULL,
                        api_base_url VARCHAR(255) NULL,
                        commission_percent DECIMAL(5,2) DEFAULT 0.00,
                        status VARCHAR(20) DEFAULT 'active',
                        revenue_generated DECIMAL(15,2) DEFAULT 0.00,
                        clients_managed INT DEFAULT 0,
                        payout_pending DECIMAL(15,2) DEFAULT 0.00,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        plan_id INT NULL,
                        channels_enabled TEXT NULL,
                        permissions TEXT NULL,
                        brand_name VARCHAR(100) NULL,
                        logo_url VARCHAR(255) NULL,
                        favicon_url VARCHAR(255) NULL,
                        primary_color VARCHAR(20) DEFAULT '#3b82f6',
                        secondary_color VARCHAR(20) DEFAULT '#1d4ed8',
                        support_email VARCHAR(100) NULL,
                        support_phone VARCHAR(20) NULL,
                        payment_gateway_type VARCHAR(50) DEFAULT 'none',
                        ccavenue_merchant_id VARCHAR(255) NULL,
                        ccavenue_access_code VARCHAR(255) NULL,
                        ccavenue_working_key VARCHAR(255) NULL,
                        paypal_client_id VARCHAR(255) NULL,
                        paypal_secret_key VARCHAR(255) NULL,
                        paypal_mode VARCHAR(20) DEFAULT 'sandbox'
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
                `;
                await conn.query(createTableSql);
                console.log("Re-created resellers table successfully!");
            }
        }
    } catch (globalErr) {
        console.error("Global Error:", globalErr.message);
    } finally {
        await conn.end();
    }
}

run();
