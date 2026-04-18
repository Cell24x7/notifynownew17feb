const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.production') });
const { query } = require('../config/db');

async function createTable() {
    const sql = `
        CREATE TABLE IF NOT EXISTS link_clicks (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            campaign_id VARCHAR(255),
            mobile VARCHAR(20),
            original_url TEXT,
            tracking_id VARCHAR(50) UNIQUE,
            click_count INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_clicked_at TIMESTAMP NULL
        )
    `;
    
    try {
        await query(sql);
        console.log('✅ Success: link_clicks table created successfully!');
        
        // Add some indexes for speed
        await query('CREATE INDEX idx_tracking ON link_clicks(tracking_id)');
        await query('CREATE INDEX idx_user ON link_clicks(user_id)');
        console.log('✅ Success: Indexes added!');
    } catch (e) {
        console.error('❌ Error creating table:', e.message);
    }
    process.exit(0);
}

createTable();
