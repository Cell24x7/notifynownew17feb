import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function initializeDatabase() {
  let connection;
  try {
    // First, create connection without specifying database
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
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
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT
    });

    // Create rcs_bot_master table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS rcs_bot_master (
        id bigint NOT NULL AUTO_INCREMENT,
        route_type enum('DOMESTIC','INTERNATIONAL') COLLATE utf8mb4_unicode_ci NOT NULL,
        bot_type enum('DOMESTIC','INTERNATIONAL') COLLATE utf8mb4_unicode_ci NOT NULL,
        message_type enum('OTP','TRANSACTIONAL','PROMOTIONAL') COLLATE utf8mb4_unicode_ci NOT NULL,
        billing_category enum('CONVERSATIONAL') COLLATE utf8mb4_unicode_ci NOT NULL,
        bot_name varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
        brand_name varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
        short_description varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
        brand_color varchar(7) COLLATE utf8mb4_unicode_ci NOT NULL,
        bot_logo_url varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
        banner_image_url varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
        terms_url varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
        privacy_url varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
        development_platform enum('GSMA_API','GOOGLE_API') COLLATE utf8mb4_unicode_ci NOT NULL,
        webhook_url varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
        callback_url varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
        languages_supported varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
        agree_all_carriers tinyint(1) DEFAULT '0',
        status enum('DRAFT','SUBMITTED','APPROVED','REJECTED') COLLATE utf8mb4_unicode_ci DEFAULT 'DRAFT',
        created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
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
      ) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
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
      ) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ Table rcs_bot_media created/verified');

    await connection.end();
    console.log('\n✓ Database initialization completed successfully!');
  } catch (error) {
    console.error('✗ Error initializing database:', error.message);
    process.exit(1);
  }
}

initializeDatabase();
