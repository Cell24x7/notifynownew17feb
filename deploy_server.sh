#!/bin/bash

# =========================================================
# 🚀 NotifyNow FULL AUTO Deploy Script (Developer)
# - Force Clean: pm2 delete -> pm2 start
# - Separate DB: developer_notify
# - Automated Environment Separation
# =========================================================

set -e  # Stop on any error

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
ok "Dependencies ready"

# ── Step 4: Environment Setup ─────────────────────────
log "🛠️  [4/7] Enforcing Developer Environment settings..."

# 1. Frontend Env (VITE_API_URL is critical for build)
cat <<EOF > "$FRONTEND_DIR/.env.production"
VITE_API_URL=https://developer.notifynow.in
EOF

# 2. Backend Env
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
ok "Environment files created"

# ── Step 5: Build frontend ────────────────────────────────
log "🏗️  [5/7] Building frontend (npm run build)..."
cd "$FRONTEND_DIR"
npm run build

if [ $? -ne 0 ]; then
    err "Frontend build FAILED!"
    exit 1
fi
ok "Frontend built successfully!"

# Fix dist folder permissions
chmod -R 755 "$DIST_DIR"
ok "dist/ permissions fixed (755)"

# ── Step 6: DB migration ───────────────────────────────
log "🗄️  [6/7] Checking DB migration..."
cd "$PROJECT_DIR"
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

# ── Step 7: Restart Clean ─────────────────────────────
log "♻️  [7/7] Starting clean PM2 instance..."
cd "$PROJECT_DIR"
APP_NAME_FROM_CONFIG=$(node -e "console.log(require('./ecosystem.config.js').apps[0].name)")
pm2 delete "$APP_NAME_FROM_CONFIG" 2>/dev/null || true
pm2 start ecosystem.config.js --env production
pm2 save --force
ok "Instance '$APP_NAME_FROM_CONFIG' is active on Developer Port (5000)"

echo ""
echo -e "${GREEN}${BOLD}=========================================="
echo -e "  ✨ DEVELOPER DEPLOYMENT COMPLETE! 🎉    "
echo -e "==========================================${NC}"
echo ""
