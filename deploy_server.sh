#!/bin/bash

# =========================================================
# 🚀 NotifyNow FULL AUTO Deploy Script
# Just type: up
# - Git pull → npm install → build → fix permissions → pm2
# - Auto: production env, no manual changes ever needed
# =========================================================

set -e  # Stop on any error

PROJECT_DIR="/home/adm.Cell24X7/developer.notifynow.in/notifynow"
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
echo -e "==========================================${NC}"
echo ""

# ── Step 1: Go to project dir ─────────────────────────────
log "📂 [1/7] Navigating to project..."
if [ ! -d "$PROJECT_DIR" ]; then
    err "Directory not found: $PROJECT_DIR"
    exit 1
fi
cd "$PROJECT_DIR"
mkdir -p "$LOGS_DIR"
ok "$(pwd)"

# ── Step 2: Fix all permissions BEFORE git ────────────────
log "🔐 [2/7] Setting permissions..."
chmod -R 755 "$PROJECT_DIR" 2>/dev/null || true
ok "Permissions set on project directory"

# ── Step 3: Git pull latest code ──────────────────────────
log "📥 [3/7] Pulling latest from GitHub..."
git remote set-url origin "$REMOTE_REPO"
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

# Kill any running vite dev server (avoids port conflict)
pkill -f "vite" 2>/dev/null || true

# Build
npm run build

if [ $? -ne 0 ]; then
    err "Frontend build FAILED! Check errors above."
    exit 1
fi
ok "Frontend built successfully!"

# Fix dist folder permissions
chmod -R 755 "$DIST_DIR"
ok "dist/ permissions fixed (755)"

# Check dist exists and is fresh
DIST_TIME=$(date -r "$DIST_DIR/index.html" "+%d-%m-%Y %H:%M" 2>/dev/null || echo "unknown")
ok "dist/index.html last built: $DIST_TIME"

cd "$PROJECT_DIR"

# ── Step 6: DB migration ──────────────────────────────────
log "🗄️  [6/7] Checking DB migration..."
if [ -f "$BACKEND_DIR/migration_fix_template_type.js" ]; then
    NODE_ENV=production node "$BACKEND_DIR/migration_fix_template_type.js"
    ok "Migration complete"
else
    warn "No migration file found — skipping"
fi

# ── Step 7: PM2 restart with production env ───────────────
log "♻️  [7/7] Restarting PM2 with NODE_ENV=production..."

if ! command -v pm2 &> /dev/null; then
    warn "PM2 not found — installing globally..."
    npm install -g pm2
fi

if pm2 list | grep -q "notifynow"; then
    pm2 restart ecosystem.config.js --env production --update-env
    ok "PM2 app 'notifynow' restarted"
else
    pm2 start ecosystem.config.js --env production
    ok "PM2 app started fresh"
fi

pm2 save --force
ok "PM2 config saved (auto-restart on reboot)"

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
