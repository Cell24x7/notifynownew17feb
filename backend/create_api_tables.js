require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { query } = require('./config/db');

async function createApiTables() {
    try {
        console.log('Creating api_campaigns table...');
        await query(`
            CREATE TABLE IF NOT EXISTS api_campaigns (
                id varchar(255) NOT NULL,
                user_id int(11) DEFAULT NULL,
                name varchar(255) DEFAULT NULL,
                channel varchar(50) DEFAULT NULL,
                template_id varchar(255) DEFAULT NULL,
                template_name varchar(255) DEFAULT NULL,
                audience_id int(11) DEFAULT NULL,
                recipient_count int(11) DEFAULT 0,
                audience_count int(11) DEFAULT 0,
                status varchar(50) DEFAULT 'draft',
                scheduled_at datetime DEFAULT NULL,
                created_at timestamp DEFAULT current_timestamp(),
                updated_at timestamp DEFAULT current_timestamp() ON UPDATE current_timestamp(),
                sent_count int(11) DEFAULT 0,
                failed_count int(11) DEFAULT 0,
                delivered_count int(11) DEFAULT 0,
                read_count int(11) DEFAULT 0,
                credits_deducted tinyint(1) DEFAULT 0,
                template_type enum('standard','rich_card','carousel') DEFAULT 'standard',
                variable_mapping longtext DEFAULT NULL,
                template_metadata longtext DEFAULT NULL,
                template_body text DEFAULT NULL,
                PRIMARY KEY (id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
        `);

        console.log('Creating api_campaign_queue table...');
        await query(`
            CREATE TABLE IF NOT EXISTS api_campaign_queue (
                id bigint(20) NOT NULL AUTO_INCREMENT,
                campaign_id varchar(255) DEFAULT NULL,
                user_id int(11) DEFAULT NULL,
                mobile varchar(20) DEFAULT NULL,
                variables longtext DEFAULT NULL,
                status enum('pending','processing','sent','failed') DEFAULT 'pending',
                message_id varchar(255) DEFAULT NULL,
                error_message text DEFAULT NULL,
                created_at timestamp DEFAULT current_timestamp(),
                updated_at timestamp DEFAULT current_timestamp() ON UPDATE current_timestamp(),
                PRIMARY KEY (id),
                KEY campaign_id (campaign_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
        `);

        console.log('Creating api_message_logs table...');
        await query(`
            CREATE TABLE IF NOT EXISTS api_message_logs (
                id int(11) NOT NULL AUTO_INCREMENT,
                user_id int(11) DEFAULT NULL,
                campaign_id varchar(255) DEFAULT NULL,
                template_name varchar(100) DEFAULT NULL,
                campaign_name varchar(100) DEFAULT NULL,
                message_id varchar(255) DEFAULT NULL,
                recipient varchar(20) DEFAULT NULL,
                status varchar(50) DEFAULT NULL,
                channel varchar(50) DEFAULT 'rcs',
                failure_reason text DEFAULT NULL,
                created_at timestamp DEFAULT current_timestamp(),
                send_time datetime DEFAULT current_timestamp(),
                delivery_time datetime DEFAULT NULL,
                read_time datetime DEFAULT NULL,
                updated_at timestamp DEFAULT current_timestamp() ON UPDATE current_timestamp(),
                PRIMARY KEY (id),
                KEY campaign_id (campaign_id),
                KEY message_id (message_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
        `);

        console.log('✅ API tables created successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating API tables:', error);
        process.exit(1);
    }
}

createApiTables();
