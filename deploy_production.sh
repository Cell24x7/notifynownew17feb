#!/bin/bash

# =========================================================
# 🚀 NotifyNow FULL AUTO Deploy Script (Production)
# - Force Clean: pm2 delete -> pm2 start
# - Separate DB: notifynow_db
# =========================================================

set -e  # Stop on any error

# ─── Configuration ─────────────────────────────────────────
PROJECT_DIR=$(pwd)
FRONTEND_DIR="$PROJECT_DIR/frontend"
BACKEND_DIR="$PROJECT_DIR/backend"
DIST_DIR="$FRONTEND_DIR/dist"

# 📦 FIXED PRODUCTION SETTINGS (Locked)
APP_NAME="notifynow-live-prod"
APP_PORT="5050"
APP_DB="notifynow_db"
APP_URL="https://notifynow.in"
ENV_DESC="PRODUCTION"

# ─── Colors for pretty output ────────────────────────────
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
echo -e "  🚀 NotifyNow PRODUCTION Deployment      "
echo -e "==========================================${NC}"

# ── Step 1: Verification ─────────────────────────────
log "📂 [1/7] Verifying structure..."
if [ ! -d "$BACKEND_DIR" ] || [ ! -d "$FRONTEND_DIR" ]; then
    err "Error: Not in a proper project directory."
    exit 1
fi

# ── Step 2: Git pull ──────────────────────────────────
log "📥 [2/7] Pulling from GitHub..."
git fetch origin main
git reset --hard origin/main
COMMIT=$(git log -1 --pretty=format:'%h — %s (%ar)')
ok "Updated to: $COMMIT"

# ── Step 3: Dependencies ──────────────────────────────
log "📦 [3/7] Installing dependencies..."
cd "$BACKEND_DIR"
npm install --production --silent
cd "$FRONTEND_DIR"
npm install --silent
# ── Step 4: Enforce Env ───────────────────────────────
log "🛠️  [4/7] Enforcing Production Env..."
cd "$BACKEND_DIR"

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

# ── Step 5: Build Frontend ────────────────────────────
log "🏗️  [5/7] Building frontend..."
cd "$FRONTEND_DIR"
npm run build
ok "Frontend built successfully"

# Fix Nginx Permissions
chmod o+x "$PROJECT_DIR" || true
chmod -R o+r "$FRONTEND_DIR/dist" || true
chmod o+x "$FRONTEND_DIR" || true
chmod o+x "$FRONTEND_DIR/dist" || true

# ── Step 6: Migrations ────────────────────────────────
log "🗄️  [6/7] Running DB migrations & schema fixes..."
cd "$BACKEND_DIR"
NODE_ENV=production node apply_schema_updates.js || true
NODE_ENV=production node scripts/add_api_key.js || true
NODE_ENV=production node scripts/setup_admin.js || true
NODE_ENV=production node optimize_db.js || true

# CRITICAL: Fix columns (message_id, recipient sizes, indexes)
log "   🔧 Running fix_logs_schema.js (CRITICAL)..."
NODE_ENV=production node fix_logs_schema.js
ok "Schema fix applied successfully"

# ── Step 7: Restart SMART ─────────────────────────────
log "♻️  [7/7] Restarting PM2 instance (Zero-Downtime)..."
cd "$PROJECT_DIR"

# Use ecosystem.config.js for robustness
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

# Final backup of PM2 state
pm2 save --force

ok "Instance '$APP_NAME' is live and stable."

echo "✨ PRODUCTION DEPLOYMENT COMPLETE!"
