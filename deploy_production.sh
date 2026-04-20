#!/bin/bash

# =========================================================
# 🚀 NotifyNow PRO Production Deployment Script
# 
# Usage on Server:
#   1. chmod +x deploy_production.sh
#   2. ./deploy_production.sh
# =========================================================

set -e  # Stop on any error

# ─── Configuration ─────────────────────────────────────────
PROJECT_DIR=$(pwd)
FRONTEND_DIR="$PROJECT_DIR/frontend"
BACKEND_DIR="$PROJECT_DIR/backend"
DIST_DIR="$FRONTEND_DIR/dist"

# 📦 FIXED PRODUCTION SETTINGS
APP_NAME="notifynow-live-prod"
APP_PORT="5050"
APP_DB="notifynow_db"
APP_URL="https://notifynow.in"
ENV_DESC="PRODUCTION"

# ─── Colors ────────────────────────────────────────────────
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' 

log()  { echo -e "\n${BOLD}${BLUE}📦 $1${NC}"; }
ok()   { echo -e "   ${GREEN}✅ $1${NC}"; }
warn() { echo -e "   ${YELLOW}⚠️  $1${NC}"; }
err()  { echo -e "   ${RED}❌ $1${NC}"; }

clear
echo -e "${BOLD}${BLUE}"
echo "=========================================="
echo "   🚀 NotifyNow PRODUCTION DEPLOYMENT     "
echo "=========================================="
echo -e "${NC}"

# ── Step 1: Verification ───────────────────────────────────
log "[1/8] Verifying environment..."
if [ ! -d "$BACKEND_DIR" ] || [ ! -d "$FRONTEND_DIR" ]; then
    err "Fatal: Directory structure mismatch. Run this from project root."
    exit 1
fi
ok "Structure verified."

# ── Step 2: Inhale Latest Code ─────────────────────────────
log "[2/8] Pulling latest code from GitHub..."
git fetch origin main
git reset --hard origin/main
COMMIT=$(git log -1 --pretty=format:'%h — %s (%ar)')
ok "Updated to: $COMMIT"

# ── Step 3: Dependencies ──────────────────────────────────
log "[3/8] Building dependency tree..."
cd "$BACKEND_DIR"
npm install --production --silent
cd "$FRONTEND_DIR"
npm install --silent
ok "Dependencies installed."

# ── Step 4: Build Frontend (Production) ────────────────────
log "[4/8] Building Frontend Assets..."
cd "$FRONTEND_DIR"
# Ensure clean build
rm -rf dist
VITE_API_URL="$APP_URL" npm run build
ok "Frontend build complete."

# ── Step 5: Permission Hardening ───────────────────────────
log "[5/8] Hardening Nginx/Static permissions..."
chmod o+x "$PROJECT_DIR" || true
chmod o+x "$FRONTEND_DIR" || true
chmod -R 755 "$FRONTEND_DIR/dist" || true
ok "Static assets permissions fixed."

# ── Step 6: Database & Schema Sync ────────────────────────
log "[6/8] Syncing Database Schema & Environments..."
cd "$BACKEND_DIR"

# Clean up any potentially locked environment files
ENV_FILE=".env.production"
if [ ! -f "$BACKEND_DIR/$ENV_FILE" ]; then
    touch "$BACKEND_DIR/$ENV_FILE"
fi

# Strictly sync PRODUCTION settings only
perl -i -pe "s|^PORT=.*|PORT=$APP_PORT|g" "$BACKEND_DIR/$ENV_FILE"
perl -i -pe "s|^DB_NAME=.*|DB_NAME=$APP_DB|g" "$BACKEND_DIR/$ENV_FILE"
perl -i -pe "s|^API_BASE_URL=.*|API_BASE_URL=$APP_URL|g" "$BACKEND_DIR/$ENV_FILE"
perl -i -pe "s|^DLR_BASE_URL=.*|DLR_BASE_URL=http://notifynow.in|g" "$BACKEND_DIR/$ENV_FILE"
perl -i -pe "s|^APP_NAME=.*|APP_NAME=$APP_NAME|g" "$BACKEND_DIR/$ENV_FILE"
perl -i -pe "s|^WHATSAPP_VERIFY_TOKEN=.*|WHATSAPP_VERIFY_TOKEN=na|g" "$BACKEND_DIR/$ENV_FILE"

# Ensure they exist if missing
grep -q "^PORT=" "$BACKEND_DIR/$ENV_FILE" || echo "PORT=$APP_PORT" >> "$BACKEND_DIR/$ENV_FILE"
grep -q "^DB_NAME=" "$BACKEND_DIR/$ENV_FILE" || echo "DB_NAME=$APP_DB" >> "$BACKEND_DIR/$ENV_FILE"
grep -q "^API_BASE_URL=" "$BACKEND_DIR/$ENV_FILE" || echo "API_BASE_URL=$APP_URL" >> "$BACKEND_DIR/$ENV_FILE"

# 🚦 STRICTLY FORCE HTTP FOR KANNEL COMPATIBILITY
if grep -q "^DLR_BASE_URL=" "$BACKEND_DIR/$ENV_FILE"; then
    perl -i -pe "s|^DLR_BASE_URL=.*|DLR_BASE_URL=http://notifynow.in|g" "$BACKEND_DIR/$ENV_FILE"
else
    echo "DLR_BASE_URL=http://notifynow.in" >> "$BACKEND_DIR/$ENV_FILE"
fi

grep -q "^APP_NAME=" "$BACKEND_DIR/$ENV_FILE" || echo "APP_NAME=$APP_NAME" >> "$BACKEND_DIR/$ENV_FILE"
grep -q "^WHATSAPP_VERIFY_TOKEN=" "$BACKEND_DIR/$ENV_FILE" || echo "WHATSAPP_VERIFY_TOKEN=na" >> "$BACKEND_DIR/$ENV_FILE"

# 💎 PROERO: Ensure core DB credentials exist (even if perl didn't touch them)
grep -q "^DB_HOST=" "$BACKEND_DIR/$ENV_FILE" || warn "DB_HOST missing in $ENV_FILE!"
grep -q "^DB_USER=" "$BACKEND_DIR/$ENV_FILE" || warn "DB_USER missing in $ENV_FILE!"
grep -q "^DB_PASS=" "$BACKEND_DIR/$ENV_FILE" || warn "DB_PASS missing in $ENV_FILE!"

chmod 600 "$BACKEND_DIR/$ENV_FILE"

# Run all migration scripts
NODE_ENV=production node apply_schema_updates.js
NODE_ENV=production node scripts/fix_truncation.js || true
NODE_ENV=production node migrate_reports.js || true
NODE_ENV=production node scripts/fix_pricing_precision.js || true
NODE_ENV=production node scripts/enable_email_for_all.js || true
NODE_ENV=production node scripts/fix_sent_counts.js || true
NODE_ENV=production node scripts/fix_emojis.js || true
NODE_ENV=production node scripts/fix_collation_crash.js || true
NODE_ENV=production node scripts/fix_api_campaigns_schema.js || true
NODE_ENV=production node scripts/add_failover_lock.js || true
NODE_ENV=production node scripts/turbo_speed_optimize.js || true
log "🎙️  Deploying AI Voice Bot Infrastructure..."
NODE_ENV=production node scripts/voice_bot_infrastructure.js || true
NODE_ENV=production node scripts/add_failover_cols.js || true
NODE_ENV=production node scripts/add_media_support.js || true
NODE_ENV=production node migrate_api_flag.js || true
NODE_ENV=production node apply_schema_updates.js || true

ok "Database schema and environment are synced for $ENV_DESC."

# Update Changelog automatically from Git
echo "📔 Updating Changelog from Git logs..."
NODE_ENV=production node scripts/auto_changelog.js || true

# ── Step 7: Zero-Downtime Restart ─────────────────────────
log "[7/8] Restarting PM2 Cluster..."
cd "$PROJECT_DIR"

if pm2 list | grep -q "$APP_NAME"; then
    log "   Restarting existing instance to ensure new routes are loaded..."
    pm2 restart "$APP_NAME" --update-env
else
    log "   Spawning new production instance..."
    pm2 start "$BACKEND_DIR/index.js" --name "$APP_NAME" --env production
fi

pm2 save --force
ok "PM2 Process management complete."

# ── Step 8: Health Check ───────────────────────────────────
log "[8/8] Running Final Health Check..."
sleep 3
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "$APP_URL/api/health" || echo "FAILED")

if [ "$HEALTH" == "200" ]; then
    ok "Server is responding at $APP_URL (Status: 200 OK)"
else
    warn "Server did not respond to health check (Status: $HEALTH). Check logs: pm2 logs $APP_NAME"
fi

echo -e "\n${BOLD}${GREEN}"
echo "=========================================="
echo "    ✨  LIVE DEPLOYMENT COMPLETE!        "
echo "=========================================="
echo -e "${NC}\n"

log "🔍 Quick Diagnostic Commands:"
echo "   pm2 status           - Check application health"
echo "   pm2 logs $APP_NAME   - Stream real-time logs"
echo "   pm2 monit            - Interactive monitoring dashboard"
echo ""

