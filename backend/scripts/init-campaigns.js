const { query } = require('../config/db');

async function initDB() {
    try {
        console.log('🚀 Initializing Campaigns and Templates Database...');

        // 1. Unified Message Templates Table
        await query(`
      CREATE TABLE IF NOT EXISTS message_templates (
        id VARCHAR(50) PRIMARY KEY,
        user_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        language VARCHAR(10) DEFAULT 'en',
        category ENUM('Marketing', 'Utility', 'Authentication') DEFAULT 'Marketing',
        channel ENUM('whatsapp', 'sms', 'rcs', 'instagram', 'facebook', 'email', 'voicebot') NOT NULL,
        template_type ENUM('standard', 'carousel') DEFAULT 'standard',
        header_type ENUM('none', 'text', 'image', 'video', 'document') DEFAULT 'none',
        header_content TEXT,
        body TEXT NOT NULL,
        footer TEXT,
        status ENUM('pending', 'approved', 'rejected', 'draft') DEFAULT 'pending',
        rejection_reason TEXT,
        usage_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
        console.log('✅ message_templates table ready');

        // 2. Template Buttons Table
        await query(`
      CREATE TABLE IF NOT EXISTS template_buttons (
        id VARCHAR(50) PRIMARY KEY,
        template_id VARCHAR(50) NOT NULL,
        type ENUM('quick_reply', 'url', 'phone', 'copy_code') NOT NULL,
        label VARCHAR(255) NOT NULL,
        value VARCHAR(255),
        position INT DEFAULT 0,
        FOREIGN KEY (template_id) REFERENCES message_templates(id) ON DELETE CASCADE
      )
    `);
        console.log('✅ template_buttons table ready');

        // 3. Campaigns Table (Modifying if exists or creating)
        // We'll use a safer approach: check if table exists and add columns if missing
        const [tables] = await query("SHOW TABLES LIKE 'campaigns'");
        if (tables.length === 0) {
            await query(`
        CREATE TABLE campaigns (
          id VARCHAR(50) PRIMARY KEY,
          user_id INT NOT NULL,
          name VARCHAR(255) NOT NULL,
          channel ENUM('whatsapp', 'sms', 'rcs', 'instagram', 'facebook', 'email', 'voicebot') NOT NULL,
          template_id VARCHAR(50),
          audience_id VARCHAR(50),
          audience_count INT DEFAULT 0,
          sent_count INT DEFAULT 0,
          delivered_count INT DEFAULT 0,
          failed_count INT DEFAULT 0,
          clicked_count INT DEFAULT 0,
          cost DECIMAL(10, 2) DEFAULT 0.00,
          status ENUM('draft', 'scheduled', 'running', 'paused', 'completed') DEFAULT 'draft',
          scheduled_at TIMESTAMP NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
            console.log('✅ campaigns table created');
        } else {
            // Add missing columns to existing campaigns table if they don't exist
            const [columns] = await query("DESCRIBE campaigns");
            const columnNames = columns.map(c => c.Field);

            if (!columnNames.includes('audience_count')) await query("ALTER TABLE campaigns ADD COLUMN audience_count INT DEFAULT 0");
            if (!columnNames.includes('delivered_count')) await query("ALTER TABLE campaigns ADD COLUMN delivered_count INT DEFAULT 0");
            if (!columnNames.includes('clicked_count')) await query("ALTER TABLE campaigns ADD COLUMN clicked_count INT DEFAULT 0");
            if (!columnNames.includes('cost')) await query("ALTER TABLE campaigns ADD COLUMN cost DECIMAL(10, 2) DEFAULT 0.00");
            if (!columnNames.includes('scheduled_at')) await query("ALTER TABLE campaigns ADD COLUMN scheduled_at TIMESTAMP NULL");

            // Update status enum if needed (this can be tricky, let's just make sure it's wide enough)
            await query(`ALTER TABLE campaigns MODIFY COLUMN status ENUM('draft', 'scheduled', 'running', 'paused', 'completed', 'sent') DEFAULT 'draft'`);

            console.log('✅ campaigns table updated with missing columns');
        }

        console.log('✨ All database tables initialized successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Database Initialization Failed:', err);
        process.exit(1);
    }
}

initDB();
