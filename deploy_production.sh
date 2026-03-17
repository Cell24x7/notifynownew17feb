#!/bin/bash

# =========================================================
# 🚀 NotifyNow PRODUCTION Deploy Script
# - Git pull → npm install → build → fix permissions → pm2
# - Optimized for Production Server (notifynow_db, Port 5050)
# =========================================================

set -e  # Stop on any error

# Auto-detect project paths
PROJECT_DIR=$(pwd)
APP_NAME="notifynow-production"
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
echo -e "  🚀 NotifyNow PRODUCTION Deployment      "
echo -e "  Current Instance: ${YELLOW}$APP_NAME${NC}"
echo -e "==========================================${NC}"
echo ""

# ── Step 1: Pull Latest ──────────────────────────────
log "📥 [1/6] Pulling latest from GitHub..."
git fetch origin main
git reset --hard origin/main
COMMIT=$(git log -1 --pretty=format:'%h — %s (%ar)')
ok "Updated to: $COMMIT"

# ── Step 2: Install Dependencies ──────────────────────
log "📦 [2/6] Installing dependencies..."
cd "$BACKEND_DIR"
npm install --production --silent
ok "Backend dependencies ready"

cd "$FRONTEND_DIR"
if [ ! -d "node_modules" ]; then
    warn "node_modules missing — running npm install..."
    npm install --silent
fi
ok "Frontend dependencies ready"

# ── Step 3: Build frontend ────────────────────────────────
log "🏗️  [3/6] Building frontend (npm run build)..."

# Ensure Frontend knows which API to use
log "🌐 Configuring Frontend for PRODUCTION API..."
echo "VITE_API_URL=https://notifynow.in/api" > "$FRONTEND_DIR/.env"

npm run build
if [ $? -ne 0 ]; then
    err "Frontend build FAILED!"
    exit 1
fi
ok "Frontend built successfully!"
chmod -R 755 "$DIST_DIR"
cd "$PROJECT_DIR"

# ── Step 4: Fix DB Config for Production ──────────────────
log "🛠️  [4/6] Enforcing PRODUCTION Environment settings..."
cat <<EOF > "$BACKEND_DIR/.env.production"
# NotifyNow PRODUCTION Deployment Enforced Env
DB_HOST=localhost
DB_USER=root
DB_PASS=waQ4!r1241Kr
DB_NAME=notifynow_db
PORT=5050
API_BASE_URL=https://notifynow.in

JWT_SECRET=notifynow_prod_secret_key_secure
JWT_EXPIRES_IN=7d

# Webhook Config
WHATSAPP_VERIFY_TOKEN=notifynow_prod_token
WEBHOOK_URL_BASE=https://notifynow.in/api

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

# ── Step 5: Running Migrations ────────────────────────────
log "🗄️  [5/6] Checking DB migration..."
if [ -f "$BACKEND_DIR/apply_schema_updates.js" ]; then
    NODE_ENV=production node "$BACKEND_DIR/apply_schema_updates.js"
fi

if [ -f "$BACKEND_DIR/migration_fix_template_type.js" ]; then
    NODE_ENV=production node "$BACKEND_DIR/migration_fix_template_type.js"
fi

if [ -f "$BACKEND_DIR/migration_add_campaign_cols.js" ]; then
    NODE_ENV=production node "$BACKEND_DIR/migration_add_campaign_cols.js"
    ok "API Campaign Migration complete"
fi

# New Step: Auto-seed TGE Chatflows
if [ -f "$BACKEND_DIR/scripts/seed_tge_flows.js" ]; then
    log "🤖 Seeding TGE Chatflows..."
    NODE_ENV=production node "$BACKEND_DIR/scripts/seed_tge_flows.js"
    ok "TGE Flows Sync Complete"
fi

# ── Step 6: Restart ───────────────────────────────────────
log "♻️  [6/6] Restarting PM2 app: $APP_NAME..."
# We explicitly use the name here to ensure separation
pm2 start ecosystem.config.js --env production --name "$APP_NAME" || pm2 restart "$APP_NAME" --update-env
pm2 save --force

echo ""
echo -e "${GREEN}${BOLD}=========================================="
echo -e "  ✨ PRODUCTION DEPLOYMENT COMPLETE! 🎉   "
echo -e "==========================================${NC}"
echo ""
echo -e "  🌐 Live:  ${BOLD}https://notifynow.in${NC}"
echo -e "  🗄️  DB:   ${BOLD}notifynow_db (production)${NC}"
echo -e "  📄 ENV:  ${BOLD}.env.production ✅${NC}"
echo ""
pm2 list
