require('dotenv').config();
const mysql = require('mysql2/promise');

async function createLogsTable() {
    if (!process.env.DB_HOST || !process.env.DB_USER) {
        console.error("⚠️ WARNING: DB_HOST or DB_USER Env variables are missing.");
        return;
    }

    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });

    try {
        const connection = await pool.getConnection();
        console.log('✅ Connected to database');

        const createTableQuery = `
      CREATE TABLE IF NOT EXISTS system_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        type VARCHAR(50) NOT NULL, -- login, api, credit, admin_action, error
        action VARCHAR(255) NOT NULL,
        details TEXT,
        user_id INT,
        user_name VARCHAR(255),
        client_name VARCHAR(255),
        ip_address VARCHAR(45),
        severity VARCHAR(20) DEFAULT 'info', -- info, warning, error
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_type (type),
        INDEX idx_severity (severity),
        INDEX idx_created_at (created_at)
      )
    `;

        await connection.query(createTableQuery);
        console.log('✅ system_logs table created or already exists');

        connection.release();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating table:', error);
        process.exit(1);
    }
}

createLogsTable();
