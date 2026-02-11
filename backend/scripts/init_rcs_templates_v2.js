require('dotenv').config();
const mysql = require('mysql2/promise');

async function updateRcsTemplateSchema() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASS || 'root123',
        database: process.env.DB_NAME || 'cell24x7_db'
    });

    try {
        console.log('Connected to database.');

        // 1. Check if columns exist in rcs_templates
        const [columns] = await connection.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'rcs_templates'
        `, [process.env.DB_NAME || 'cell24x7_db']);

        const columnNames = columns.map(c => c.COLUMN_NAME);

        // Add template_type if missing
        if (!columnNames.includes('template_type')) {
            console.log('Adding template_type column...');
            await connection.query(`
                ALTER TABLE rcs_templates 
                ADD COLUMN template_type ENUM('text_message', 'rich_card', 'carousel') DEFAULT 'text_message' AFTER category
            `);
            console.log('✅ Added template_type column');
        } else {
            console.log('ℹ️ template_type column already exists');
        }

        // Add metadata if missing
        if (!columnNames.includes('metadata')) {
            console.log('Adding metadata column...');
            await connection.query(`
                ALTER TABLE rcs_templates 
                ADD COLUMN metadata JSON AFTER header_content
            `);
            console.log('✅ Added metadata column');
        } else {
            console.log('ℹ️ metadata column already exists');
        }

        // Add orientation/height/alignment/width helpers via metadata, but we won't create separate columns for them
        // The metadata JSON will hold:
        // Rich Card: { orientation, alignment, height, mediaUrl, mediaHeight, title, description }
        // Carousel: { height, width, cards: [ { title, description, mediaUrl, buttons: [] } ] }

    } catch (err) {
        console.error('Error updating schema:', err);
    } finally {
        await connection.end();
    }
}

updateRcsTemplateSchema();
