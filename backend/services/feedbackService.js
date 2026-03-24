const { query } = require('../config/db');

/**
 * Ensures the feedbacks table exists.
 */
const ensureFeedbacksTable = async () => {
    try {
        await query(`
            CREATE TABLE IF NOT EXISTS feedbacks (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                designation VARCHAR(255),
                company VARCHAR(255),
                rating INT NOT NULL,
                message TEXT NOT NULL,
                is_public TINYINT(1) DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Feedbacks table ensured');
    } catch (err) {
        console.error('❌ Error creating feedbacks table:', err);
        throw err;
    }
};

module.exports = { ensureFeedbacksTable };
