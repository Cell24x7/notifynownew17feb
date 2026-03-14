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
DB_HOST=localhost
DB_USER=root
DB_PASS=waQ4!r1241Kr
DB_NAME=notify_db
PORT=5050
API_BASE_URL=https://notifynow.in
JWT_SECRET=notifynow_db_secret_key
JWT_EXPIRES_IN=7d
VITE_RCS_API_URL=https://rcs.cell24x7.com
EOF

# 4. Restart
cd "$PROJECT_DIR"
pm2 start ecosystem.config.js --env production || pm2 restart ecosystem.config.js --env production --update-env
pm2 save --force

echo "✨ PRODUCTION DEPLOYMENT COMPLETE!"
