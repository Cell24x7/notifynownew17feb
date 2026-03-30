#!/bin/bash

# =========================================================
# 🔧 FIX: Remove stale PM2 instances + Full Deploy 
# Removes notifynow-production (old/orphan) and keeps
# notifynow-live-prod as the SINGLE active instance.
# =========================================================

PROJECT_DIR=$(pwd)
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

log()  { echo -e "${BOLD}${BLUE}$1${NC}"; }
ok()   { echo -e "   ${GREEN}✅ $1${NC}"; }
warn() { echo -e "   ${YELLOW}⚠️  $1${NC}"; }

echo ""
echo -e "${BOLD}=========================================="
echo -e "  🔧 NotifyNow: Fix Duplicate PM2 Instances "  
echo -e "==========================================${NC}"
echo ""

# ── Step 1: Git Pull Latest Code ──────────────────────────
log "📥 [1/5] Pulling latest code from GitHub..."
git fetch origin main
git reset --hard origin/main
COMMIT=$(git log -1 --pretty=format:'%h — %s (%ar)')
ok "Updated to: $COMMIT"

# ── Step 2: Install Dependencies ──────────────────────────
log "📦 [2/5] Installing dependencies..."
cd "$BACKEND_DIR" && npm install --production --silent
cd "$FRONTEND_DIR" && npm install --silent
ok "Dependencies installed"

# ── Step 3: Build Frontend ────────────────────────────────
log "🏗️  [3/5] Building frontend..."
cd "$FRONTEND_DIR"
npm run build
chmod -R 755 "$FRONTEND_DIR/dist"
ok "Frontend built"

# ── Step 4: Run Schema Fix (CRITICAL) ─────────────────────
log "🗄️  [4/5] Running DB schema fix..."
cd "$BACKEND_DIR"
NODE_ENV=production node apply_schema_updates.js || true
NODE_ENV=production node scripts/add_api_key.js || true
NODE_ENV=production node scripts/setup_admin.js || true
NODE_ENV=production node optimize_db.js || true
NODE_ENV=production node fix_logs_schema.js
ok "Schema fix complete"

# ── Step 5: Fix PM2 — Remove Old, Restart Correct ─────────
log "♻️  [5/5] Fixing PM2 instances..."
cd "$PROJECT_DIR"

# Remove the OLD/ORPHAN production instance (old code, different folder/port)
if pm2 list | grep -q "notifynow-production"; then
    warn "Removing stale 'notifynow-production' instance (old/duplicate)..."
    pm2 delete notifynow-production
    ok "Removed 'notifynow-production'"
else
    ok "'notifynow-production' not found — nothing to remove"
fi

# NOTE: notifynow-developer runs on port 5000 (separate dev server) — DO NOT TOUCH
warn "Keeping 'notifynow-developer' intact (port 5000 - separate dev server)"

# Now restart/start the correct live-prod instance
if pm2 list | grep -q "notifynow-live-prod"; then
    log "   🔄 Reloading 'notifynow-live-prod'..."
    APP_NAME=notifynow-live-prod pm2 reload ecosystem.config.js --env production
else
    log "   🚀 Starting 'notifynow-live-prod'..."
    APP_NAME=notifynow-live-prod pm2 start ecosystem.config.js --env production
fi

pm2 save --force
ok "Instance 'notifynow-live-prod' is the ONLY active instance now"

echo ""
echo -e "${BOLD}${GREEN}✨ FIX COMPLETE! Only 'notifynow-live-prod' is running.${NC}"
echo -e "${BOLD}${GREEN}   Webhook callbacks will now ONLY hit this instance.${NC}"
echo ""
pm2 list
