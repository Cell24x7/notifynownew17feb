#!/bin/bash

# =========================================================
# 🚀 NotifyNow FULL AUTO Deploy Script (Developer)
# - Force Clean: pm2 delete -> pm2 start
# - Separate DB: developer_notify
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

# ── Step 4: Build Frontend ────────────────────────────
log "🏗️  [4/7] Building frontend..."
echo "VITE_API_URL=https://developer.notifynow.in/api" > "$FRONTEND_DIR/.env"
npm run build
ok "Frontend built"

# ── Step 5: Enforce Env ───────────────────────────────
log "🛠️  [5/7] Enforcing DEV settings..."
cat <<EOF > "$BACKEND_DIR/.env.production"
DB_HOST=localhost
DB_USER=root
DB_PASS=waQ4!r1241Kr
DB_NAME=developer_notify
PORT=5000
API_BASE_URL=https://developer.notifynow.in
JWT_SECRET=notifynow_db_secret_key
JWT_EXPIRES_IN=7d
WHATSAPP_VERIFY_TOKEN=notifynow_dev_token
EOF

# ── Step 6: Migrations ────────────────────────────────
log "🗄️  [6/7] Running migrations..."
cd "$BACKEND_DIR"
NODE_ENV=production node apply_schema_updates.js || true

# ── Step 7: Restart Clean ─────────────────────────────
log "♻️  [7/7] Starting clean PM2 instance..."
cd "$PROJECT_DIR"
APP_NAME_FROM_CONFIG=$(node -e "console.log(require('./ecosystem.config.js').apps[0].name)")
pm2 delete "$APP_NAME_FROM_CONFIG" 2>/dev/null || true
pm2 start ecosystem.config.js --env production
pm2 save --force
ok "Instance '$APP_NAME_FROM_CONFIG' is active on Port 5000"
echo "✨ DEVELOPER DEPLOYMENT COMPLETE!"
