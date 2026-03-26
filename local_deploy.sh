#!/bin/bash

# =========================================================
# 🚀 NotifyNow LOCAL PROJECT Deploy Script
# - Skip Git reset/pull
# - Build frontend
# - Run migrations
# - Restart PM2
# =========================================================

set -e

PROJECT_DIR=$(pwd)
FRONTEND_DIR="$PROJECT_DIR/frontend"
BACKEND_DIR="$PROJECT_DIR/backend"
DIST_DIR="$FRONTEND_DIR/dist"

# Detect environment by current folder or default to developer
if [[ "$PROJECT_DIR" == *"notifynow.in"* && "$PROJECT_DIR" != *"developer.notifynow.in"* ]]; then
    ENV_TYPE="production"
    APP_NAME="notifynow-production"
    PORT=5050
else
    ENV_TYPE="production" # The apps run in NODE_ENV=production but with different configs
    APP_NAME="notifynow-developer"
    PORT=5000
fi

echo "🚀 Starting LOCAL deployment for $APP_NAME (Port: $PORT)..."

# 1. Dependencies
log "📦 [1/4] Installing backend dependencies..."
cd "$BACKEND_DIR"
npm install --production --silent

# 2. Build Frontend
log "🏗️  [2/4] Building frontend..."
cd "$FRONTEND_DIR"
if [ ! -d "node_modules" ]; then npm install --silent; fi
npm run build
chmod -R 755 "$DIST_DIR"

# 3. Migrations
log "🗄️  [3/4] Running schema migrations..."
cd "$BACKEND_DIR"
NODE_ENV=production node apply_schema_updates.js || true

# 4. Restart
log "♻️  [4/4] Restarting PM2 instance..."
cd "$PROJECT_DIR"
fuser -k $PORT/tcp || true
pm2 delete $APP_NAME 2>/dev/null || true
pm2 start ecosystem.config.js --env production
pm2 save --force

echo "✨ LOCAL DEPLOYMENT COMPLETE! App is active on port $PORT."

function log() {
    echo -e "\033[1;34m[NotifyNow] $1\033[0m"
}
