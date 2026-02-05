const { query } = require('../config/db');

async function fixWalletSchema() {
    console.log('Starting wallet schema fix...');
    try {
        // 1. Modify transactions.type to VARCHAR to avoid ENUM truncation errors
        console.log('Modifying transactions.type...');
        await query("ALTER TABLE transactions MODIFY type VARCHAR(50) NOT NULL");
        console.log('✓ transactions.type modified to VARCHAR(50)');

        // 2. Increase precision for amount
        console.log('Modifying transactions.amount...');
        await query("ALTER TABLE transactions MODIFY amount DECIMAL(15, 2) NOT NULL");
        console.log('✓ transactions.amount modified to DECIMAL(15, 2)');

        // 3. Make description larger just in case
        console.log('Modifying transactions.description...');
        await query("ALTER TABLE transactions MODIFY description TEXT");
        console.log('✓ transactions.description modified to TEXT');

        // 4. Update users wallet_balance precision
        console.log('Modifying users.wallet_balance...');
        await query("ALTER TABLE users MODIFY wallet_balance DECIMAL(15, 2) DEFAULT 0.00");
        console.log('✓ users.wallet_balance modified to DECIMAL(15, 2)');

        console.log('✅ Schema fixes applied successfully.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error fixing schema:', err.message);
        process.exit(1);
    }
}

fixWalletSchema();
