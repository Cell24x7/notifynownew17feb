module.exports = {
  apps: [
    {
      name: 'notifynow',
      script: './backend/index.js',
      cwd: '/home/adm.Cell24X7/developer.notifynow.in/notifynow',

      // ✅ PRODUCTION ENV — auto .env.production use hoga
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000
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
