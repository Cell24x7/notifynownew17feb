const path = require('path');
const fs = require('fs');
const currentPath = __dirname;
const folderName = path.basename(currentPath);
const parentName = path.basename(path.dirname(currentPath));

// Unique App Name - Strictly separate production from dev
let appName = 'notifynow-production';
if (currentPath.includes('developer.notifynow.in')) {
    appName = 'notifynow-developer';
}

// Function to read .env files and extract all key-value pairs
const readEnv = (file) => {
  try {
    const envPath = path.join(currentPath, 'backend', file);
    if (!fs.existsSync(envPath)) return {};
    const content = fs.readFileSync(envPath, 'utf8');
    const env = {};
    content.split('\n').forEach(line => {
      // Matches KEY=VALUE while ignoring comments
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        let value = (match[2] || '').trim();
        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        env[match[1]] = value.trim();
      }
    });
    return env;
  } catch (e) {
    return {};
  }
};

const prodEnv = readEnv('.env.production');
const devEnv = readEnv('.env');

module.exports = {
  apps: [
    {
      name: appName,
      script: './backend/index.js',
      // Pass the entire env file to PM2
      env_production: {
        NODE_ENV: 'production',
        ...prodEnv
      },
      env_development: {
        NODE_ENV: 'development',
        ...devEnv
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss'
    }
  ]
};
