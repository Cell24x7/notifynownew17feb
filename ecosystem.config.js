const path = require('path');
const fs = require('fs');
const currentPath = __dirname;
const folderName = path.basename(currentPath);
const parentName = path.basename(path.dirname(currentPath));

// Unique App Name - Strictly separate production from dev
let appName = process.env.APP_NAME || 'notifynow-production';
if (!process.env.APP_NAME && currentPath.includes('developer.notifynow.in')) {
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
      script: path.join(currentPath, 'backend', 'index.js'),
      cwd: currentPath,
      env_production: {
        NODE_ENV: 'production',
        ...prodEnv
      },
      env_development: {
        NODE_ENV: 'development',
        ...devEnv
      },
      instances: 1,
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: path.join(currentPath, 'logs', `pm2-${appName}-error.log`),
      out_file: path.join(currentPath, 'logs', `pm2-${appName}-out.log`),
      log_date_format: 'YYYY-MM-DD HH:mm:ss'
    }
  ]
};
