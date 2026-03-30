#!/bin/bash

# =========================================================
# 🚀 NotifyNow DEVELOPER Deploy Script
# Server: developer.notifynow.in
# PM2 App: notifynow-developer
# Port: 5000 | DB: developer_notify
# =========================================================

set -e  # Stop on any error

# ═══ FIXED CONFIG ══════════════════════════════════════
APP_NAME="notifynow-developer"   # NEVER changes
APP_PORT="5000"                   # Developer port
APP_DB="developer_notify"         # Developer DB
APP_URL="https://developer.notifynow.in"

# Auto-detect project paths
PROJECT_DIR=$(pwd)
FRONTEND_DIR="$PROJECT_DIR/frontend"
BACKEND_DIR="$PROJECT_DIR/backend"
DIST_DIR="$FRONTEND_DIR/dist"

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
echo -e "  🚀 NotifyNow DEVELOPER Deployment       "
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
if [ ! -d "node_modules" ]; then npm install --silent; fi

# ── Step 4: Enforce Env ─────────────────────────────────
log "🛠️  [4/7] Setting DEVELOPER environment..."

# Always write correct developer settings (overwrite if wrong)
sed -i "/^DB_NAME=/c\DB_NAME=$APP_DB"          "$BACKEND_DIR/.env.production" 2>/dev/null || echo "DB_NAME=$APP_DB" >> "$BACKEND_DIR/.env.production"
sed -i "/^PORT=/c\PORT=$APP_PORT"              "$BACKEND_DIR/.env.production" 2>/dev/null || echo "PORT=$APP_PORT" >> "$BACKEND_DIR/.env.production"
sed -i "/^API_BASE_URL=/c\API_BASE_URL=$APP_URL" "$BACKEND_DIR/.env.production" 2>/dev/null || echo "API_BASE_URL=$APP_URL" >> "$BACKEND_DIR/.env.production"
sed -i "/^APP_NAME=/c\APP_NAME=$APP_NAME"      "$BACKEND_DIR/.env.production" 2>/dev/null || echo "APP_NAME=$APP_NAME" >> "$BACKEND_DIR/.env.production"

if ! grep -q "JWT_EXPIRES_IN=" "$BACKEND_DIR/.env.production" 2>/dev/null; then 
    echo "JWT_EXPIRES_IN=24h" >> "$BACKEND_DIR/.env.production"
else 
    sed -i '/^JWT_EXPIRES_IN=/c\JWT_EXPIRES_IN=24h' "$BACKEND_DIR/.env.production"
fi
if ! grep -q "JWT_SECRET=" "$BACKEND_DIR/.env.production" 2>/dev/null; then
    echo "JWT_SECRET=notifynow_db_secret_key" >> "$BACKEND_DIR/.env.production"
fi

# Frontend Env
if grep -q "VITE_API_URL=" "$FRONTEND_DIR/.env.production" 2>/dev/null; then
    sed -i "/^VITE_API_URL=/c\VITE_API_URL=$APP_URL" "$FRONTEND_DIR/.env.production"
else
    echo "VITE_API_URL=$APP_URL" >> "$FRONTEND_DIR/.env.production"
fi

# Sync .env with .env.production
cp "$FRONTEND_DIR/.env.production" "$FRONTEND_DIR/.env"
cp "$BACKEND_DIR/.env.production"  "$BACKEND_DIR/.env"
ok "Environment set: APP=$APP_NAME | PORT=$APP_PORT | DB=$APP_DB"

# ── Step 5: Build Frontend ────────────────────────────
log "🏗️  [5/7] Building frontend..."
cd "$FRONTEND_DIR"
npm install --silent # Always ensure fresh modules for developer build
npm run build
ok "Frontend built"


# Fix dist folder permissions
chmod -R 755 "$DIST_DIR"

# ── Step 6: Migrations ────────────────────────────────
log "🗄️  [6/7] Running DB migrations & schema fixes..."
cd "$BACKEND_DIR"
NODE_ENV=production node apply_schema_updates.js || true
NODE_ENV=production node scripts/add_api_key.js || true
NODE_ENV=production node scripts/setup_admin.js || true
NODE_ENV=production node optimize_db.js || true

# CRITICAL: Fix all missing columns (worker_id, message_id, indexes)
log "   🔧 Running fix_logs_schema.js (CRITICAL)..."
NODE_ENV=production node fix_logs_schema.js
ok "Schema fix applied successfully"

# APP_NAME from .env.production
if [ -f "$BACKEND_DIR/.env.production" ]; then
    APP_NAME=$(grep "^APP_NAME=" "$BACKEND_DIR/.env.production" | cut -d'=' -f2 | tr -d '"\'' ')
fi
: "${APP_NAME:=notifynow-developer}"

# ── Step 7: Restart SMART ─────────────────────────────
log "♻️  [7/7] Restarting PM2: $APP_NAME (zero-downtime)..."
cd "$PROJECT_DIR"

if pm2 list | grep -q "$APP_NAME"; then
    log "   🔄 Reloading '$APP_NAME'..."
    APP_NAME=$APP_NAME pm2 reload ecosystem.config.js --env production
else
    log "   🚀 Starting '$APP_NAME' (new)..."
    APP_NAME=$APP_NAME pm2 start ecosystem.config.js --env production
fi

pm2 save --force
ok "Instance '$APP_NAME' is stable and running."
echo "✨ DEVELOPER DEPLOYMENT COMPLETE! ($APP_NAME on port $APP_PORT)"
