const path = require('path');
const currentPath = __dirname;
const folderName = path.basename(currentPath);
const parentName = path.basename(path.dirname(currentPath));

// Generate a unique name like "developer.notifynow.in-notifynow"
const appName = (parentName && parentName !== 'adm.Cell24X7') ? `${parentName}-${folderName}` : folderName;

module.exports = {
  apps: [
    {
      name: appName,
      script: './backend/index.js',
      // cwd: env-specific cwd is removed to use local project root

      // ✅ PRODUCTION ENV — auto .env.production use hoga
      env_production: {
        NODE_ENV: 'production'
        // PORT is picked up from .env.production
      },

      // ✅ LOCAL DEV — auto .env use hoga
      env_development: {
        NODE_ENV: 'development',
        PORT: 5000
      },

      // PM2 settings
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
