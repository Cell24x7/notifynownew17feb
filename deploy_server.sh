#!/bin/bash

# =========================================================
# 🚀 NotifyNow FULL AUTO Deploy Script
# Just type: up
# - Git pull → npm install → build → fix permissions → pm2
# - Auto: production env, no manual changes ever needed
# =========================================================

set -e  # Stop on any error

# Auto-detect project paths
PROJECT_DIR=$(pwd)
APP_NAME=$(basename "$PROJECT_DIR")
FRONTEND_DIR="$PROJECT_DIR/frontend"
BACKEND_DIR="$PROJECT_DIR/backend"
DIST_DIR="$FRONTEND_DIR/dist"
LOGS_DIR="$PROJECT_DIR/logs"
REMOTE_REPO="git@github.com:Cell24x7/notifynownew17feb.git"

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
echo -e "  🚀 NotifyNow Auto Deployment            "
echo -e "  Current Instance: ${YELLOW}$APP_NAME${NC}"
echo -e "==========================================${NC}"
echo ""

# ── Step 1: Verification ─────────────────────────────
log "📂 [1/7] Verifying project structure..."
if [ ! -d "$BACKEND_DIR" ] || [ ! -d "$FRONTEND_DIR" ]; then
    err "Error: Not in a proper NotifyNow project directory."
    exit 1
fi
mkdir -p "$LOGS_DIR"
ok "Working in: $PROJECT_DIR"

# ── Step 2: Fix all permissions BEFORE git ────────────────
log "🔐 [2/7] Setting permissions..."
chmod -R 755 "$PROJECT_DIR" 2>/dev/null || true
ok "Permissions set"

# ── Step 3: Git pull latest code ──────────────────────────
log "📥 [3/7] Pulling latest from GitHub..."
git fetch origin main
git reset --hard origin/main
COMMIT=$(git log -1 --pretty=format:'%h — %s (%ar)')
ok "Updated to: $COMMIT"

# ── Step 4: Install backend dependencies ──────────────────
log "📦 [4/7] Installing backend dependencies..."
cd "$BACKEND_DIR"
npm install --production --silent
ok "Backend dependencies ready"
cd "$PROJECT_DIR"

# ── Step 5: Build frontend ────────────────────────────────
log "🏗️  [5/7] Building frontend (npm run build)..."
cd "$FRONTEND_DIR"

# Install if node_modules missing or package changed
if [ ! -d "node_modules" ]; then
    warn "node_modules missing — running npm install..."
    npm install --silent
fi

# Build
npm run build

if [ $? -ne 0 ]; then
    err "Frontend build FAILED!"
    exit 1
fi
ok "Frontend built successfully!"

# Fix dist folder permissions
chmod -R 755 "$DIST_DIR"
ok "dist/ permissions fixed (755)"

cd "$PROJECT_DIR"

# ── Step 6: DB migration & ENV enforcement ──────────────
log "🛠️  [6/7] Enforcing Developer Environment settings..."
cat <<EOF > "$BACKEND_DIR/.env.production"
# ENFORCED DEVELOPER SETTINGS
DB_HOST=localhost
DB_USER=root
DB_PASS=waQ4!r1241Kr
DB_NAME=developer_notify
PORT=5000
API_BASE_URL=https://developer.notifynow.in
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

log "🗄️  Checking DB migration..."
if [ -f "$BACKEND_DIR/apply_schema_updates.js" ]; then
    NODE_ENV=production node "$BACKEND_DIR/apply_schema_updates.js"
fi

if [ -f "$BACKEND_DIR/migration_fix_template_type.js" ]; then
    NODE_ENV=production node "$BACKEND_DIR/migration_fix_template_type.js"
fi

if [ -f "$BACKEND_DIR/migration_add_campaign_cols.js" ]; then
    # Adds campaign tracking for webhook Developer API
    NODE_ENV=production node "$BACKEND_DIR/migration_add_campaign_cols.js"
    ok "API Campaign Migration complete"
fi

if [ -f "$BACKEND_DIR/migration_final.js" ]; then
    NODE_ENV=production node "$BACKEND_DIR/migration_final.js"
fi

# New Step: Auto-seed TGE Chatflows
if [ -f "$BACKEND_DIR/scripts/seed_tge_flows.js" ]; then
    log "🤖 Seeding TGE Chatflows..."
    NODE_ENV=production node "$BACKEND_DIR/scripts/seed_tge_flows.js"
    ok "TGE Flows Sync Complete"
else
    warn "No seeder file found — skipping"
fi

# ── Step 7: PM2 restart with unique app name ──────────────
log "♻️  [7/7] Restarting PM2 app: $APP_NAME..."

if ! command -v pm2 &> /dev/null; then
    warn "PM2 not found — installing globally..."
    npm install -g pm2
fi

# Start/Restart exactly this folder's instance
# We let ecosystem.config.js handle the unique naming
pm2 start ecosystem.config.js --env production || pm2 restart ecosystem.config.js --env production --update-env

ok "Instance '$APP_NAME' is active"
pm2 save --force
ok "PM2 config saved"

# ─── Final Status ─────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}=========================================="
echo -e "  ✨ DEPLOYMENT COMPLETE! 🎉              "
echo -e "==========================================${NC}"
echo ""
echo -e "  🌐 Live:  ${BOLD}https://developer.notifynow.in${NC}"
echo -e "  🗄️  DB:   ${BOLD}developer_notify (production)${NC}"
echo -e "  📄 ENV:  ${BOLD}.env.production ✅${NC}"
echo -e "  📦 Dist: ${BOLD}$DIST_TIME${NC}"
echo ""
echo -e "${BOLD}── PM2 Status ────────────────────────────${NC}"
pm2 list
echo ""
