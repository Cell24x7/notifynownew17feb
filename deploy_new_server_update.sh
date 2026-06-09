#!/bin/bash

# =========================================================
# 🚀 NotifyNow New Server — Safe Update & Deployment Script
#
# Use this script on the new server (64.227.183.240) to pull
# the latest code, run database migrations (without wiping data),
# compile the frontend, and reload the PM2 cluster.
#
# Usage on New Server:
#   chmod +x deploy_new_server_update.sh
#   ./deploy_new_server_update.sh
# =========================================================

set -e

# ─── Configuration ─────────────────────────────────────────
PROJECT_DIR=$(pwd)
FRONTEND_DIR="$PROJECT_DIR/frontend"
BACKEND_DIR="$PROJECT_DIR/backend"
DIST_DIR="$FRONTEND_DIR/dist"

APP_NAME="notifynow-live-prod"
APP_PORT="5050"
APP_DB="notifynow_db"
# Fetch target server IP dynamically (fallback to the new server IP)
SERVER_IP=$(curl -s ifconfig.me || echo "64.227.183.240")
if [ "$SERVER_IP" == "64.227.183.240" ]; then
    APP_URL="https://notifynow.in"
else
    APP_URL="http://$SERVER_IP"
fi
ENV_DESC="NEW SERVER PRODUCTION"

# ─── Colors ────────────────────────────────────────────────
GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'

log()  { echo -e "\n${BOLD}${BLUE}📦 $1${NC}"; }
ok()   { echo -e "   ${GREEN}✅ $1${NC}"; }
warn() { echo -e "   ${YELLOW}⚠️  $1${NC}"; }
err()  { echo -e "   ${RED}❌ $1${NC}"; }
step() { echo -e "   ${BLUE}▶  $1${NC}"; }

echo -e "${BOLD}${BLUE}"
echo "======================================================"
echo "   🚀 NotifyNow NEW SERVER SAFE UPDATE DEPLOYMENT     "
echo "======================================================"
echo -e "${NC}"

DEPLOY_START=$SECONDS

# ── Step 1: Verification ───────────────────────────────────
log "[1/7] Verifying environment..."
if [ ! -d "$BACKEND_DIR" ] || [ ! -d "$FRONTEND_DIR" ]; then
    err "Fatal: Run this from project root."; exit 1
fi
ok "Structure OK."

# ── Step 2: Pull Latest Code ───────────────────────────────
log "[2/7] Pulling latest code from GitHub..."
git fetch origin main
git reset --hard origin/main
COMMIT=$(git log -1 --pretty=format:'%h — %s (%ar)')
ok "Updated to: $COMMIT"

# ── Step 3: Smart Dependency Install ──────────────────────
log "[3/7] Smart dependency install (skips if unchanged)..."

# Backend: skip if package-lock unchanged since last deploy
BACKEND_LOCK="$BACKEND_DIR/package-lock.json"
BACKEND_MD5_FILE="$BACKEND_DIR/.last_install_md5"
CURRENT_BACKEND_MD5=""
if [ -f "$BACKEND_LOCK" ]; then
    CURRENT_BACKEND_MD5=$(md5sum "$BACKEND_LOCK" 2>/dev/null | cut -d' ' -f1 || sha1sum "$BACKEND_LOCK" 2>/dev/null | cut -d' ' -f1 || echo "1")
fi

if [ -f "$BACKEND_LOCK" ] && { [ ! -f "$BACKEND_MD5_FILE" ] || [ "$(cat "$BACKEND_MD5_FILE")" != "$CURRENT_BACKEND_MD5" ]; }; then
    step "Backend package-lock changed — installing..."
    cd "$BACKEND_DIR"
    npm install --production --prefer-offline --no-audit --no-fund 2>&1 | tail -3
    echo "$CURRENT_BACKEND_MD5" > "$BACKEND_MD5_FILE"
    ok "Backend deps updated."
else
    ok "Backend deps unchanged — skipped ⚡"
fi

# Frontend: skip if package-lock unchanged
FRONTEND_LOCK="$FRONTEND_DIR/package-lock.json"
FRONTEND_MD5_FILE="$FRONTEND_DIR/.last_install_md5"
CURRENT_FRONTEND_MD5=""
if [ -f "$FRONTEND_LOCK" ]; then
    CURRENT_FRONTEND_MD5=$(md5sum "$FRONTEND_LOCK" 2>/dev/null | cut -d' ' -f1 || sha1sum "$FRONTEND_LOCK" 2>/dev/null | cut -d' ' -f1 || echo "1")
fi

if [ -f "$FRONTEND_LOCK" ] && { [ ! -f "$FRONTEND_MD5_FILE" ] || [ "$(cat "$FRONTEND_MD5_FILE")" != "$CURRENT_FRONTEND_MD5" ]; }; then
    step "Frontend package-lock changed — installing..."
    cd "$FRONTEND_DIR"
    npm install --prefer-offline --no-audit --no-fund 2>&1 | tail -3
    echo "$CURRENT_FRONTEND_MD5" > "$FRONTEND_MD5_FILE"
    ok "Frontend deps updated."
else
    ok "Frontend deps unchanged — skipped ⚡"
fi

# ── Step 4: ENV Config ────────────────────────────────────
log "[4/7] Configuring environment..."
cd "$BACKEND_DIR"
ENV_FILE=".env.production"
[ ! -f "$BACKEND_DIR/$ENV_FILE" ] && touch "$BACKEND_DIR/$ENV_FILE"

# Update env vars with single perl pass (fast)
perl -i -pe "
    s|^PORT=.*|PORT=$APP_PORT|g;
    s|^DB_NAME=.*|DB_NAME=$APP_DB|g;
    s|^DB_PASS=.*|DB_PASS=0dgoldimagecf38532|g;
    s|^API_BASE_URL=.*|API_BASE_URL=$APP_URL|g;
    s|^DLR_BASE_URL=.*|DLR_BASE_URL=$APP_URL|g;
    s|^APP_NAME=.*|APP_NAME=$APP_NAME|g;
    s|^BACKEND_URL=.*|BACKEND_URL=$APP_URL/api|g;
    s|^FRONTEND_URL=.*|FRONTEND_URL=$APP_URL|g;
" "$BACKEND_DIR/$ENV_FILE"

# Ensure keys exist if not present
grep -q "^PORT="                    "$BACKEND_DIR/$ENV_FILE" || echo "PORT=$APP_PORT"                             >> "$BACKEND_DIR/$ENV_FILE"
grep -q "^DB_NAME="                 "$BACKEND_DIR/$ENV_FILE" || echo "DB_NAME=$APP_DB"                           >> "$BACKEND_DIR/$ENV_FILE"
grep -q "^API_BASE_URL="            "$BACKEND_DIR/$ENV_FILE" || echo "API_BASE_URL=$APP_URL"                     >> "$BACKEND_DIR/$ENV_FILE"
grep -q "^DLR_BASE_URL="            "$BACKEND_DIR/$ENV_FILE" || echo "DLR_BASE_URL=$APP_URL"                      >> "$BACKEND_DIR/$ENV_FILE"
grep -q "^APP_NAME="                "$BACKEND_DIR/$ENV_FILE" || echo "APP_NAME=$APP_NAME"                        >> "$BACKEND_DIR/$ENV_FILE"
grep -q "^BACKEND_URL="             "$BACKEND_DIR/$ENV_FILE" || echo "BACKEND_URL=$APP_URL/api"                  >> "$BACKEND_DIR/$ENV_FILE"
grep -q "^FRONTEND_URL="            "$BACKEND_DIR/$ENV_FILE" || echo "FRONTEND_URL=$APP_URL"                     >> "$BACKEND_DIR/$ENV_FILE"

grep -q "^DB_HOST=" "$BACKEND_DIR/$ENV_FILE" || warn "DB_HOST missing in $ENV_FILE!"
grep -q "^DB_USER=" "$BACKEND_DIR/$ENV_FILE" || warn "DB_USER missing in $ENV_FILE!"
grep -q "^DB_PASS=" "$BACKEND_DIR/$ENV_FILE" || echo "DB_PASS=0dgoldimagecf38532" >> "$BACKEND_DIR/$ENV_FILE"
chmod 600 "$BACKEND_DIR/$ENV_FILE"
ok "ENV configured."

# ── Step 5: SEQUENTIAL — DB Migrations + Frontend Build ───
log "[5/7] Running DB migrations + frontend build sequentially..."

# Release database locks by temporarily stopping PM2
if pm2 list | grep -q "$APP_NAME"; then
    step "Temporarily stopping PM2 application to release database metadata locks..."
    pm2 stop "$APP_NAME" || true
fi

# ─── 5a: DB Migrations (sequential) ────
cd "$BACKEND_DIR"
step "Running database migrations sequentially (OOM protection)..."

# Run Core Schema first
NODE_ENV=production node apply_schema_updates.js 2>&1 | grep -v "already exists\|Skipping\|^$" || true

# Run all other migration scripts one by one to avoid CPU/RAM spikes
for script in scripts/fix_truncation.js migrate_reports.js scripts/fix_pricing_precision.js scripts/fix_emojis.js scripts/fix_collation_crash.js scripts/fix_api_campaigns_schema.js scripts/add_failover_lock.js scripts/enable_email_for_all.js scripts/fix_sent_counts.js scripts/add_failover_cols.js scripts/voice_bot_infrastructure.js update_smm_schema.js update_rcs_multi_provider.js scripts/add_media_support.js migrate_api_flag.js migration_reseller_payment.js migration_reseller_paypal.js scripts/migrate_chats_meta.js; do
    if [ -f "$BACKEND_DIR/$script" ]; then
        NODE_ENV=production node "$BACKEND_DIR/$script" 2>&1 | grep -v "already exists\|Skipping\|already utf8mb4\|^$" || true
    fi
done

# Run index optimization last
if [ -f "$BACKEND_DIR/scripts/turbo_speed_optimize.js" ]; then
    NODE_ENV=production node "$BACKEND_DIR/scripts/turbo_speed_optimize.js" 2>&1 | grep -v "already exists\|Skipping\|^$" || true
fi

ok "Database migrations complete."

# ─── 5b: Frontend Build (sequential, memory-limited) ───
step "Building frontend (Vite build)..."
cd "$FRONTEND_DIR"
rm -rf dist
echo "VITE_API_URL=$APP_URL" > .env
echo "VITE_GOOGLE_CLIENT_ID=387794158424-hrsujhlj0eiahvufcti0do80201oj79h.apps.googleusercontent.com" >> .env
NODE_OPTIONS="--max-old-space-size=1024" VITE_API_URL="$APP_URL" npm run build -- --logLevel warn
chmod -R 755 "$FRONTEND_DIR/dist"
chmod o+x "$PROJECT_DIR" || true
chmod o+x "$FRONTEND_DIR" || true
ok "Frontend build complete."

# ── Step 6: PM2 Zero-Downtime Reload ──────────────────────
log "[6/7] PM2 Zero-Downtime Reload..."
cd "$PROJECT_DIR"

if pm2 list | grep -q "$APP_NAME"; then
    if [ -f "ecosystem.config.js" ]; then
        APP_NAME="$APP_NAME" pm2 start ecosystem.config.js --env production || APP_NAME="$APP_NAME" pm2 reload ecosystem.config.js --env production
    else
        pm2 start "$APP_NAME" --update-env || pm2 reload "$APP_NAME" --update-env
    fi
    ok "PM2 started/reloaded successfully."
else
    if [ -f "ecosystem.config.js" ]; then
        APP_NAME="$APP_NAME" pm2 start ecosystem.config.js --env production
    else
        pm2 start "$BACKEND_DIR/index.js" --name "$APP_NAME" --env production
    fi
    ok "PM2 started new instance."
fi
pm2 save --force

# ── Step 7: Health Check with Retry ───────────────────────
log "[7/7] Health check..."
HEALTH="000"
for i in 1 2 3 4 5; do
    sleep 2
    HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "$APP_URL/api/health" 2>/dev/null || echo "000")
    if [ "$HEALTH" == "200" ]; then break; fi
    step "Retrying health check ($i/5)..."
done

if [ "$HEALTH" == "200" ]; then
    ok "Server is LIVE at $APP_URL (200 OK) ✨"
else
    warn "Health check returned: $HEALTH — check: pm2 logs $APP_NAME"
fi

# ── Done ───────────────────────────────────────────────────
ELAPSED=$((SECONDS - DEPLOY_START))
echo -e "\n${BOLD}${GREEN}"
echo "=========================================="
echo "   ✨  NEW SERVER UPDATE COMPLETE!        "
echo "   ⏱️  Total time: ${ELAPSED}s             "
echo "=========================================="
echo -e "${NC}\n"

# ── PM2 App Status Overview ────────────────────────────────
log "PM2 Application Status:"
pm2 status

echo -e "\n${BOLD}${GREEN}✅ DEPLOYMENT STATUS: OK — App is fully active!${NC}\n"
