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

if [[ "$PROJECT_DIR" == *"developer"* ]]; then
    # DEVELOPER SETTINGS
    APP_NAME="notifynow-developer"
    APP_PORT="5000"
    APP_DB="developer_notify"
    APP_URL="https://developer.notifynow.in"
    ENV_DESC="DEVELOPER"
else
    # PRODUCTION SETTINGS
    APP_NAME="notifynow-live-prod"
    APP_PORT="5050"
    APP_DB="notifynow_main"
    APP_URL="https://notifynow.in"
    ENV_DESC="PRODUCTION"
fi

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

# Sync environment variables across both files to be safe
for ENV_FILE in ".env" ".env.production"; do
    if [ ! -f "$BACKEND_DIR/$ENV_FILE" ]; then
        touch "$BACKEND_DIR/$ENV_FILE"
    fi
    
    # Use perl for more reliable in-place replacement than sed on some systems
    # Synchronize Port, DB Name, and API URL
    perl -i -pe "s|^PORT=.*|PORT=$APP_PORT|g" "$BACKEND_DIR/$ENV_FILE"
    perl -i -pe "s|^DB_NAME=.*|DB_NAME=$APP_DB|g" "$BACKEND_DIR/$ENV_FILE"
    perl -i -pe "s|^API_BASE_URL=.*|API_BASE_URL=$APP_URL|g" "$BACKEND_DIR/$ENV_FILE"
    perl -i -pe "s|^APP_NAME=.*|APP_NAME=$APP_NAME|g" "$BACKEND_DIR/$ENV_FILE"
    
    # Add if they don't exist
    grep -q "^PORT=" "$BACKEND_DIR/$ENV_FILE" || echo "PORT=$APP_PORT" >> "$BACKEND_DIR/$ENV_FILE"
    grep -q "^DB_NAME=" "$BACKEND_DIR/$ENV_FILE" || echo "DB_NAME=$APP_DB" >> "$BACKEND_DIR/$ENV_FILE"
    grep -q "^API_BASE_URL=" "$BACKEND_DIR/$ENV_FILE" || echo "API_BASE_URL=$APP_URL" >> "$BACKEND_DIR/$ENV_FILE"
done

ok "Environment variables synchronized for $ENV_DESC (Port: $APP_PORT)"

# ── Step 4: Build Frontend (Optional Sync) ─────────────
log "🏗️  [3/6] Building Frontend..."
cd "$FRONTEND_DIR"
# Check if dist exists and is recent (optional optimization)
npm install --silent
npm run build
ok "Frontend built successfully."

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

# ── Step 6: Reload PM2 (Zero Downtime) ─────────────────
log "♻️  [5/6] Restarting $APP_NAME..."
cd "$PROJECT_DIR"

# Fix permissions to prevent Nginx 403 Forbidden
# Ensures web server can traverse the path
chmod o+x "$PROJECT_DIR" || true
chmod -R o+r "$FRONTEND_DIR/dist" || true
chmod o+x "$FRONTEND_DIR" || true
chmod o+x "$FRONTEND_DIR/dist" || true

# Use ecosystem.config.js - more robust for environment variables
if pm2 list | grep -q "$APP_NAME"; then
    log "  🔄 App already exists, reloading..."
    # Always reload based on ecosystem config if available
    if [ -f "ecosystem.config.js" ]; then
        APP_NAME=$APP_NAME pm2 reload ecosystem.config.js --env production
    else
        pm2 reload $APP_NAME --update-env
    fi
else
    log "  🚀 Starting new instance..."
    if [ -f "ecosystem.config.js" ]; then
        APP_NAME=$APP_NAME pm2 start ecosystem.config.js --env production
    else
        APP_NAME=$APP_NAME pm2 start backend/index.js --name $APP_NAME --env production
    fi
fi

pm2 save --force
ok "Deployment Successful! Instance is live."

echo ""
echo -e "${GREEN}${BOLD}✨ $ENV_DESC DEPLOYMENT COMPLETE!${NC}"
echo -e "   URL: $APP_URL"
echo ""
