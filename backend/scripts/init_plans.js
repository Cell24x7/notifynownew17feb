import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const defaultPlans = [
    {
        name: "Basic",
        price: 99.00,
        monthly_credits: 1000,
        client_count: 5,
        channels_allowed: ["sms", "email"],
        automation_limit: 10,
        campaign_limit: 50,
        api_access: false,
        status: 'active'
    },
    {
        name: "Professional",
        price: 299.00,
        monthly_credits: 5000,
        client_count: 20,
        channels_allowed: ["sms", "email", "whatsapp", "rcs"],
        automation_limit: -1, // Unlimited
        campaign_limit: -1, // Unlimited
        api_access: true,
        status: 'active'
    },
    {
        name: "Enterprise",
        price: 999.00,
        monthly_credits: 20000,
        client_count: 100,
        channels_allowed: ["sms", "email", "whatsapp", "rcs", "voicebot"],
        automation_limit: -1,
        campaign_limit: -1,
        api_access: true,
        status: 'active'
    }
];

async function initializePlans() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT
        });

        console.log('✓ Connected to database');

        // Create plans table
        await connection.query(`
      CREATE TABLE IF NOT EXISTS plans (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        monthly_credits INT NOT NULL DEFAULT 0,
        client_count INT NOT NULL DEFAULT 1,
        channels_allowed JSON,
        automation_limit INT DEFAULT -1,
        campaign_limit INT DEFAULT -1,
        api_access BOOLEAN DEFAULT FALSE,
        status ENUM('active', 'inactive') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
        console.log('✓ Table plans created/verified');

        // Check if plans exist
        const [rows] = await connection.query('SELECT COUNT(*) as count FROM plans');

        if (rows[0].count === 0) {
            console.log('Seeding default plans...');
            for (const plan of defaultPlans) {
                await connection.query(`
          INSERT INTO plans (
            id, name, price, monthly_credits, client_count, 
            channels_allowed, automation_limit, campaign_limit, api_access, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
                    uuidv4(),
                    plan.name,
                    plan.price,
                    plan.monthly_credits,
                    plan.client_count,
                    JSON.stringify(plan.channels_allowed),
                    plan.automation_limit,
                    plan.campaign_limit,
                    plan.api_access,
                    plan.status
                ]);
            }
            console.log('✓ Default plans seeded');
        } else {
            console.log('✓ Plans table already has data');
        }

        await connection.end();
        process.exit(0);
    } catch (error) {
        console.error('✗ Error initializing plans:', error);
        process.exit(1);
    }
}

initializePlans();
