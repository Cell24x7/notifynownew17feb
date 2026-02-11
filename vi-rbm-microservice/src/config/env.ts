import dotenv from 'dotenv';
import path from 'path';

// Specify path if needed, or default to root of project
dotenv.config({ path: path.join(__dirname, '../../.env') });

export const config = {
    server: {
        port: process.env.PORT || 3000,
        nodeEnv: process.env.NODE_ENV || 'development',
        baseUrl: process.env.API_BASE_URL || 'http://localhost:3000'
    },
    viRbm: {
        serverRoot: process.env.VI_RBM_SERVER_ROOT || 'https://api.vi-rbm.com',
        authUrl: process.env.VI_AUTH_URL || 'https://auth.vi-rbm.com/oauth/token',
        clientId: process.env.CLIENT_ID || '',
        clientSecret: process.env.CLIENT_SECRET || '',
        botId: process.env.BOT_ID || '',
        webhookSecret: process.env.WEBHOOK_SECRET || '',
    },
    webhook: {
        url: process.env.WEBHOOK_URL || '',
    },
    logging: {
        level: process.env.LOG_LEVEL || 'info',
    }
};

// Simple validation
const requiredKeys = ['CLIENT_ID', 'CLIENT_SECRET', 'BOT_ID'];
const missingKeys = requiredKeys.filter(key => !process.env[key]);

if (missingKeys.length > 0) {
    console.warn(`⚠️ Warning: Missing required environment variables: ${missingKeys.join(', ')}`);
}
