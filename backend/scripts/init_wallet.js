const { query } = require('../config/db');

async function initWalletTables() {
    try {
        console.log('Initializing wallet tables...');

        // 1. Add wallet_balance to users table if it doesn't exist
        // We check if the column exists first to avoid errors
        const [columns] = await query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'users' 
            AND COLUMN_NAME = 'wallet_balance'
        `);

        if (columns.length === 0) {
            console.log('Adding wallet_balance column to users table...');
            await query(`
                ALTER TABLE users 
                ADD COLUMN wallet_balance DECIMAL(10, 2) DEFAULT 0.00 AFTER credits_available
            `);
            console.log('✓ wallet_balance column added.');
        } else {
            console.log('✓ wallet_balance column already exists.');
        }

        // 2. Create transactions table
        console.log('Creating transactions table...');
        await query(`
            CREATE TABLE IF NOT EXISTS transactions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                amount DECIMAL(10, 2) NOT NULL,
                type ENUM('credit', 'debit') NOT NULL,
                description VARCHAR(255) NOT NULL,
                status VARCHAR(50) DEFAULT 'completed',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_user_id (user_id),
                INDEX idx_created_at (created_at),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        console.log('✓ Transactions table created/verified.');

        console.log('✅ Wallet initialization completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error initializing wallet tables:', error);
        process.exit(1);
    }
}

initWalletTables();
