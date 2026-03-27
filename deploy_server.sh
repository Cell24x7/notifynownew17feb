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

# ── Step 4: Enforce Env ───────────────────────────────
log "🛠️  [4/7] Enforcing DEV settings..."
# Backend Env (Strictly preserve credentials if file exists)
if [ ! -f "$BACKEND_DIR/.env.production" ]; then
    warn ".env.production not found, creating from template..."
cat <<EOF > "$BACKEND_DIR/.env.production"
DB_HOST=localhost
DB_USER=root
DB_PASS=waQ4!r1241Kr
DB_NAME=developer_notify
PORT=5000
API_BASE_URL=https://developer.notifynow.in
JWT_SECRET=notifynow_db_secret_key
JWT_EXPIRES_IN=20m
EOF

else
    sed -i '/^DB_HOST=/c\DB_HOST=localhost' "$BACKEND_DIR/.env.production"
    sed -i '/^DB_NAME=/c\DB_NAME=developer_notify' "$BACKEND_DIR/.env.production"
    sed -i '/^PORT=/c\PORT=5000' "$BACKEND_DIR/.env.production"
    sed -i '/^API_BASE_URL=/c\API_BASE_URL=https://developer.notifynow.in' "$BACKEND_DIR/.env.production"
    if ! grep -q "JWT_EXPIRES_IN=" "$BACKEND_DIR/.env.production"; then echo "JWT_EXPIRES_IN=20m" >> "$BACKEND_DIR/.env.production"; else sed -i '/^JWT_EXPIRES_IN=/c\JWT_EXPIRES_IN=20m' "$BACKEND_DIR/.env.production"; fi
    if ! grep -q "JWT_SECRET=" "$BACKEND_DIR/.env.production"; then echo "JWT_SECRET=notifynow_db_secret_key" >> "$BACKEND_DIR/.env.production"; fi
fi

# Frontend Env (VITE_API_URL is critical for build)
API_URL="https://developer.notifynow.in"
# Preserve other variables (like VITE_GOOGLE_CLIENT_ID) instead of overwriting
if [ ! -f "$FRONTEND_DIR/.env.production" ]; then
    cat <<EOF > "$FRONTEND_DIR/.env.production"
VITE_API_URL=$API_URL
VITE_GOOGLE_CLIENT_ID=387794158424-hrsujhlj0eiahvufcti0do80201oj79h.apps.googleusercontent.com
EOF
else
    # Update or add API URL
    if grep -q "VITE_API_URL=" "$FRONTEND_DIR/.env.production"; then
        sed -i "/^VITE_API_URL=/c\VITE_API_URL=$API_URL" "$FRONTEND_DIR/.env.production"
    else
        echo "VITE_API_URL=$API_URL" >> "$FRONTEND_DIR/.env.production"
    fi
    # Update or add Google ID
    GOOGLE_ID="387794158424-hrsujhlj0eiahvufcti0do80201oj79h.apps.googleusercontent.com"
    if grep -q "VITE_GOOGLE_CLIENT_ID=" "$FRONTEND_DIR/.env.production"; then
        sed -i "/^VITE_GOOGLE_CLIENT_ID=/c\VITE_GOOGLE_CLIENT_ID=$GOOGLE_ID" "$FRONTEND_DIR/.env.production"
    else
        echo "VITE_GOOGLE_CLIENT_ID=$GOOGLE_ID" >> "$FRONTEND_DIR/.env.production"
    fi
fi

# Sync .env with .env.production for simplicity
cp "$FRONTEND_DIR/.env.production" "$FRONTEND_DIR/.env"
cp "$BACKEND_DIR/.env.production" "$BACKEND_DIR/.env"
ok "Environment files updated (API: $API_URL)"

# ── Step 5: Build Frontend ────────────────────────────
log "🏗️  [5/7] Building frontend..."
cd "$FRONTEND_DIR"
npm install --silent # Always ensure fresh modules for developer build
npm run build
ok "Frontend built"


# Fix dist folder permissions
chmod -R 755 "$DIST_DIR"

# ── Step 6: Migrations ────────────────────────────────
log "🗄️  [6/7] Running migrations..."
cd "$BACKEND_DIR"
NODE_ENV=production node apply_schema_updates.js || true
NODE_ENV=production node scripts/add_api_key.js || true
NODE_ENV=production node scripts/setup_admin.js || true
NODE_ENV=production node optimize_db.js || true

# ── Step 7: Restart SMART ─────────────────────────────
log "♻️  [7/7] Restarting PM2 instance (Zero-Downtime)..."
cd "$PROJECT_DIR"

# Check if app is already running
if pm2 list | grep -q "$APP_NAME"; then
    log "   🔄 App '$APP_NAME' is running, reloading..."
    # Use reload for zero-downtime, it keeps other apps safe
    APP_NAME=$APP_NAME pm2 reload ecosystem.config.js --env production
else
    log "   🚀 App '$APP_NAME' is new, starting..."
    APP_NAME=$APP_NAME pm2 start ecosystem.config.js --env production
fi

# Save to ensure persistence after server reboot
pm2 save --force

ok "Instance '$APP_NAME' is stable and running."

echo "✨ DEVELOPER DEPLOYMENT COMPLETE!"
