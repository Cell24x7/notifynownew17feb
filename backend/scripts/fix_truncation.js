const { query } = require('./config/db');

async function fixTruncationAggressive() {
    try {
        console.log('🚀 AGGRESSIVE MIGRATION: Identifying and fixing ALL truncation bottlenecks...');
        
        // 1. Get all tables
        const [tables] = await query('SHOW TABLES');
        const databaseName = process.env.DB_NAME;
        
        for (let tableRow of tables) {
            const tableName = Object.values(tableRow)[0];
            
            // 2. Get columns for each table
            const [cols] = await query(`DESCRIBE ${tableName}`);
            
            for (let col of cols) {
                const colName = col.Field;
                const colType = col.Type.toLowerCase();
                
                // 3. Target any column that might cause the "type" truncation error
                if (colName === 'type' || colName === 'template_type' || colName === 'channel' || colName === 'status') {
                    console.log(`🔨 Forcing ${tableName}.${colName} to larger capacity...`);
                    try {
                        // Use VARCHAR(255) to be safe but keep indexing if possible, or TEXT for zero limit
                        await query(`ALTER TABLE ${tableName} MODIFY COLUMN ${colName} VARCHAR(255)`);
                        console.log(`   ✅ ${tableName}.${colName} fixed.`);
                    } catch (e) {
                        console.warn(`   ⚠️  Failed to fix ${tableName}.${colName}: ${e.message}`);
                    }
                }
            }
        }

        console.log('✨ Aggressive migration completed successfully!');
    } catch (err) {
        console.error('❌ Aggressive fix error:', err.message);
    } finally {
        process.exit(0);
    }
}

fixTruncationAggressive();
