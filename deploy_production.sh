#!/bin/bash

# =========================================================
# 🚀 NotifyNow PRODUCTION Deploy Script
# - Git pull → npm install → build → fix permissions → pm2
# - Optimized for Production Server (notify_db, Port 5050)
# =========================================================

set -e

PROJECT_DIR=$(pwd)
APP_NAME="notifynow.in-notifynow"
FRONTEND_DIR="$PROJECT_DIR/frontend"
BACKEND_DIR="$PROJECT_DIR/backend"
DIST_DIR="$FRONTEND_DIR/dist"

echo "=========================================="
echo "  🚀 NotifyNow PRODUCTION Deployment      "
echo "=========================================="

# 1. Pull Latest
git fetch origin main
git reset --hard origin/main

# 2. Config check
log() { echo -e "\033[1;34m$1\033[0m"; }

log "📦 Installing dependencies..."
cd "$BACKEND_DIR"
npm install --production
cd "$FRONTEND_DIR"
npm install
npm run build

# 3. Fix DB Config for Production
log "🛠️ Ensuring Production DB config..."
cat <<EOF > "$BACKEND_DIR/.env.production"
# NotifyNow PRODUCTION Deployment Enforced Env
DB_HOST=localhost
DB_USER=root
DB_PASS=waQ4!r1241Kr
DB_NAME=notifynow_db
PORT=5050
API_BASE_URL=https://notifynow.in

JWT_SECRET=notifynow_db_secret_key
JWT_EXPIRES_IN=7d

# SMS Configuration
SMS_USER=testdemo
SMS_PASSWORD=apidemo
SMS_SENDER_ID=CMTLTD

VITE_RCS_API_URL=https://rcs.cell24x7.com

# Dotgo Admin
DOTGO_ADMIN_CLIENT_ID=cmNzQGNlbGwyNHg3LmNvbQ
DOTGO_ADMIN_CLIENT_SECRET=6YPfAx6eYtRGbpkIKFwf5gqVQ21Nvja3
DOTGO_ADMIN_AUTH_URL=https://auth.dotgo.com/auth/oauth/token
DOTGO_ADMIN_TEMPLATE_URL=https://developer-api.dotgo.com/directory/secure/api/v1/bots

# Email Configuration
EMAIL_API_USER=testdemo
EMAIL_API_PASS=passdemo
EMAIL_FROM_ADDR=support@cell24x7.com
EMAIL_API_URL=http://43.242.212.34:7716/emailService/sendEmail
EOF

# 4. Running Migrations
log "🗄️ Checking DB migration..."
if [ -f "$BACKEND_DIR/migration_fix_template_type.js" ]; then
    NODE_ENV=production node "$BACKEND_DIR/migration_fix_template_type.js"
fi

if [ -f "$BACKEND_DIR/migration_add_campaign_cols.js" ]; then
    NODE_ENV=production node "$BACKEND_DIR/migration_add_campaign_cols.js"
    echo "   ✅ Migration complete"
fi

if [ -f "$BACKEND_DIR/scripts/seed_tge_flows.js" ]; then
    log "🤖 Seeding TGE Chatflows..."
    NODE_ENV=production node "$BACKEND_DIR/scripts/seed_tge_flows.js"
    echo "   ✅ TGE Flows Sync Complete"
fi

# 5. Restart
cd "$PROJECT_DIR"
pm2 start ecosystem.config.js --env production || pm2 restart ecosystem.config.js --env production --update-env
pm2 save --force

echo "✨ PRODUCTION DEPLOYMENT COMPLETE!"
