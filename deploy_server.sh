#!/bin/bash

# =========================================================
# 🚀 NotifyNow SMART Deploy Script (1Cr Scaling Edition)
# Supports: Production (notifynow.in) & Developer (developer.notifynow.in)
# =========================================================

set -e  # Stop on any error

# ── Step 1: Smart Environment Detection ─────────────────
PROJECT_DIR=$(pwd)
FRONTEND_DIR="$PROJECT_DIR/frontend"
BACKEND_DIR="$PROJECT_DIR/backend"
DIST_DIR="$FRONTEND_DIR/dist"

# 📦 FIXED DEVELOPER SETTINGS (Locked)
APP_NAME="notifynow-developer"
APP_PORT="5000"
APP_DB="developer_notify"
APP_URL="https://developer.notifynow.in"
ENV_DESC="DEVELOPER"

# ── Colors for pretty output ────────────────────────────
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

log()  { echo -e "${BOLD}${BLUE}$1${NC}"; }
ok()   { echo -e "   ${GREEN}✅ $1${NC}"; }
warn() { echo -e "   ${YELLOW}⚠️  $1${NC}"; }
err()  { echo -e "   ${RED}❌ $1${NC}"; }

echo ""
echo -e "${BOLD}=========================================="
echo -e "  🚀 NotifyNow $ENV_DESC Deployment       "
echo -e "  URL: $APP_URL | DB: $APP_DB             "
echo -e "==========================================${NC}"

# ── Step 2: Git Sync ──────────────────────────────────
log "📥 [1/6] Pulling Latest Changes..."
git fetch origin main
git reset --hard origin/main
COMMIT=$(git log -1 --pretty=format:'%h — %s (%ar)')
ok "Pulled latest: $COMMIT"

# ── Step 3: Dependencies & Environment ────────────────
log "📦 [2/6] Installing Dependencies & Setting Env..."
cd "$BACKEND_DIR"
npm install --production --silent

# ONLY modify .env for Developer - NEVER touch .env.production here
ENV_FILE=".env"
if [ ! -f "$BACKEND_DIR/$ENV_FILE" ]; then
    touch "$BACKEND_DIR/$ENV_FILE"
fi

# Use perl for safe in-place replacement
perl -i -pe "s|^PORT=.*|PORT=$APP_PORT|g" "$BACKEND_DIR/$ENV_FILE"
perl -i -pe "s|^DB_NAME=.*|DB_NAME=$APP_DB|g" "$BACKEND_DIR/$ENV_FILE"
perl -i -pe "s|^API_BASE_URL=.*|API_BASE_URL=$APP_URL|g" "$BACKEND_DIR/$ENV_FILE"
perl -i -pe "s|^APP_NAME=.*|APP_NAME=$APP_NAME|g" "$BACKEND_DIR/$ENV_FILE"

# Add if they don't exist
grep -q "^PORT=" "$BACKEND_DIR/$ENV_FILE" || echo "PORT=$APP_PORT" >> "$BACKEND_DIR/$ENV_FILE"
grep -q "^DB_NAME=" "$BACKEND_DIR/$ENV_FILE" || echo "DB_NAME=$APP_DB" >> "$BACKEND_DIR/$ENV_FILE"
grep -q "^API_BASE_URL=" "$BACKEND_DIR/$ENV_FILE" || echo "API_BASE_URL=$APP_URL" >> "$BACKEND_DIR/$ENV_FILE"
grep -q "^APP_NAME=" "$BACKEND_DIR/$ENV_FILE" || echo "APP_NAME=$APP_NAME" >> "$BACKEND_DIR/$ENV_FILE"

ok "Environment variables synchronized for $ENV_DESC (Port: $APP_PORT)"

# ── Step 4: Build Frontend (With Environment Sync) ──────────
log "🏗️  [3/6] Building Frontend for $ENV_DESC..."
cd "$FRONTEND_DIR"

# Sync Frontend Env (CRITICAL: Prevents Developer hitting Production API)
ENV_FILE=".env"
if [ ! -f "$FRONTEND_DIR/$ENV_FILE" ]; then
    touch "$FRONTEND_DIR/$ENV_FILE"
fi
perl -i -pe "s|^VITE_API_URL=.*|VITE_API_URL=$APP_URL|g" "$FRONTEND_DIR/$ENV_FILE"
grep -q "^VITE_API_URL=" "$FRONTEND_DIR/$ENV_FILE" || echo "VITE_API_URL=$APP_URL" >> "$FRONTEND_DIR/$ENV_FILE"
# Ensure Google Client ID is also set correctly
if ! grep -q "^VITE_GOOGLE_CLIENT_ID=" "$FRONTEND_DIR/$ENV_FILE"; then
    echo "VITE_GOOGLE_CLIENT_ID=387794158424-hrsujhlj0eiahvufcti0do80201oj79h.apps.googleusercontent.com" >> "$FRONTEND_DIR/$ENV_FILE"
fi

rm -rf dist
npm install --silent
npm run build
ok "Frontend built successfully for $APP_URL"

# ── Step 5: Database Optimization (1Cr Ready) ─────────
log "🗄️  [4/6] Optimizing Database & Running Migrations..."
cd "$BACKEND_DIR"

# Run the 1Cr Speed-Boost Indexer
log "   📊 Running optimize_db.js..."
NODE_ENV=production node optimize_db.js || warn "Optimization skipped or already done."

# Final Schema Fixes
log "   🔧 Running fix_logs_schema.js..."
NODE_ENV=production node fix_logs_schema.js || true
ok "Database is optimized and ready for high volume."

# ── Step 6: Reload PM2 & Fix Permissions ───────────────
log "♻️  [5/6] Restarting $APP_NAME & Fixing Permissions..."
cd "$PROJECT_DIR"

# MANDATORY: Fix permissions for Nginx visibility
# This ensures Nginx can traverse ALL the way into the dist folder
log "   🔓 Opening folder permissions for Nginx..."
chmod o+x /home/adm.Cell24X7 || true
chmod o+x /home/adm.Cell24X7/developer.notifynow.in || true
chmod o+x "$PROJECT_DIR" || true
chmod -R 755 "$FRONTEND_DIR/dist" || true
chmod o+x "$FRONTEND_DIR" || true
chmod o+x "$FRONTEND_DIR/dist" || true

# Use ecosystem.config.js - more robust for environment variables
if pm2 list | grep -q "$APP_NAME"; then
    log "  🔄 App already exists, reloading..."
    # Always reload based on ecosystem config if available
    if [ -f "ecosystem.config.js" ]; then
        APP_NAME=$APP_NAME pm2 reload ecosystem.config.js --env development
    else
        pm2 reload $APP_NAME --update-env
    fi
else
    log "  🚀 Starting new instance..."
    if [ -f "ecosystem.config.js" ]; then
        APP_NAME=$APP_NAME pm2 start ecosystem.config.js --env development
    else
        APP_NAME=$APP_NAME pm2 start backend/index.js --name $APP_NAME --env development
    fi
fi

pm2 save --force
ok "Deployment Successful! Instance is live in $ENV_DESC mode."

echo ""
echo -e "${GREEN}${BOLD}✨ $ENV_DESC DEPLOYMENT COMPLETE!${NC}"
echo -e "   URL: $APP_URL"
echo ""
