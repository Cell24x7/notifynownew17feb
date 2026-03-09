const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function initializeDatabase() {
  let connection;
  try {
    // First, create connection without specifying database
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      port: process.env.DB_PORT,
      multipleStatements: true
    });

    console.log('✓ Connected to MySQL Server');

    // Create database if not exists
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`);
    console.log(`✓ Database '${process.env.DB_NAME}' created/verified`);

    // Close and reconnect to the specific database
    await connection.end();

    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT
    });

    // Create rcs_bot_master table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS rcs_bot_master (
        id bigint NOT NULL AUTO_INCREMENT,
        user_id int DEFAULT NULL,
        bot_id varchar(100) DEFAULT NULL,
        brand_id varchar(100) DEFAULT NULL,
        route_type varchar(50) DEFAULT 'DOMESTIC',
        bot_type varchar(50) DEFAULT 'DOMESTIC',
        message_type varchar(50) DEFAULT 'Promotional',
        billing_category varchar(50) DEFAULT 'Non_Conversational',
        bot_name varchar(100) NOT NULL,
        brand_name varchar(100) NOT NULL,
        brand_address text,
        brand_industry varchar(100),
        short_description text,
        brand_color varchar(20) DEFAULT '#000000',
        bot_logo_url varchar(255) DEFAULT NULL,
        banner_image_url varchar(255) DEFAULT NULL,
        terms_url varchar(255) DEFAULT NULL,
        privacy_url varchar(255) DEFAULT NULL,
        rcs_api varchar(100) DEFAULT 'Google API',
        development_platform varchar(50) DEFAULT 'GSMA_API',
        webhook_url varchar(255) DEFAULT NULL,
        callback_url varchar(255) DEFAULT NULL,
        languages_supported varchar(255) DEFAULT 'English',
        agree_all_carriers tinyint(1) DEFAULT '0',
        status varchar(50) DEFAULT 'DRAFT',
        created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ Table rcs_bot_master created/verified');

    // Create rcs_bot_contacts table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS rcs_bot_contacts (
        id bigint NOT NULL AUTO_INCREMENT,
        bot_id bigint NOT NULL,
        contact_type enum('PHONE','EMAIL','WEBSITE') COLLATE utf8mb4_unicode_ci NOT NULL,
        contact_value varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
        label varchar(25) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
        created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY bot_id (bot_id),
        CONSTRAINT rcs_bot_contacts_ibfk_1 FOREIGN KEY (bot_id) REFERENCES rcs_bot_master (id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ Table rcs_bot_contacts created/verified');

    // Create rcs_bot_media table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS rcs_bot_media (
        id bigint NOT NULL AUTO_INCREMENT,
        bot_id bigint NOT NULL,
        media_type enum('LOGO','BANNER') COLLATE utf8mb4_unicode_ci NOT NULL,
        media_url varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
        created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY bot_id (bot_id),
        CONSTRAINT rcs_bot_media_ibfk_1 FOREIGN KEY (bot_id) REFERENCES rcs_bot_master (id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ Table rcs_bot_media created/verified');

    await connection.end();
    console.log('\n✓ Database initialization completed successfully!');
  } catch (error) {
    console.error('✗ Error initializing database:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  initializeDatabase();
}

module.exports = initializeDatabase;
