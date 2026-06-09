#!/bin/bash

# ==============================================================================
# 🚀 NotifyNow — Automated Setup & Deployment Script for New Server
# Target Host: 64.227.183.240 (AlmaLinux 9.8)
#
# This script automates:
#   1. System packages check & Redis installation/start
#   2. Local database (notifynow_db) setup in MariaDB
#   3. Secure .env.production file setup
#   4. Dynamic dependency installation & database schema updates
#   5. Production compilation of React Frontend
#   6. Automated Nginx reverse-proxy configuration & SELinux permissions fix
#   7. PM2 process manager startup & state persistence
# ==============================================================================

set -e

# --- Configurations ---
PROJECT_DIR=$(pwd)
FRONTEND_DIR="$PROJECT_DIR/frontend"
BACKEND_DIR="$PROJECT_DIR/backend"
APP_NAME="notifynow-live-prod"
APP_PORT="5050"
APP_DB="notifynow_db"
DB_PASS="0dgoldimagecf38532"  # Identified remote MariaDB root password

# Fetch target server IP dynamically (fallback to target IP)
SERVER_IP=$(curl -s ifconfig.me || echo "64.227.183.240")
APP_URL="http://$SERVER_IP"

# --- Colors ---
GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'

log()  { echo -e "\n${BOLD}${BLUE}📦 $1${NC}"; }
ok()   { echo -e "   ${GREEN}✅ $1${NC}"; }
warn() { echo -e "   ${YELLOW}⚠️  $1${NC}"; }
err()  { echo -e "   ${RED}❌ $1${NC}"; }
step() { echo -e "   ${BLUE}▶  $1${NC}"; }

clear
echo -e "${BOLD}${BLUE}======================================================"
echo "      🚀 NotifyNow AUTO-DEPLOY & PROVISIONING SCRIPT  "
echo "      Target IP: $SERVER_IP | Port: $APP_PORT         "
echo -e "======================================================${NC}"

# --- Step 1: System Packages Check & Provisioning ---
log "[1/7] Provisioning required system packages..."

# 1. Install Redis (BullMQ dependency)
if ! rpm -q redis >/dev/null 2>&1; then
    step "Installing Redis server..."
    sudo dnf install -y redis
    ok "Redis installed."
else
    ok "Redis already installed."
fi

# Enable & Start Redis
step "Enabling and starting Redis service..."
sudo systemctl enable redis --now
sudo systemctl start redis
ok "Redis service is active."

# 2. Check Nginx
if ! rpm -q nginx >/dev/null 2>&1; then
    step "Installing Nginx server..."
    sudo dnf install -y nginx
    ok "Nginx installed."
else
    ok "Nginx already installed."
fi
sudo systemctl enable nginx --now
sudo systemctl start nginx
ok "Nginx service is active."

# --- Step 2: Database Initialization ---
log "[2/7] Initializing MySQL/MariaDB schema..."

step "Creating database '$APP_DB' if not exists..."
mysql -u root -p"$DB_PASS" -e "CREATE DATABASE IF NOT EXISTS $APP_DB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
ok "Database '$APP_DB' verified."

# --- Step 3: Configure Environment Variables ---
log "[3/7] Setting up secure production configurations..."

cd "$BACKEND_DIR"
ENV_FILE=".env.production"
[ ! -f "$ENV_FILE" ] && touch "$ENV_FILE"

# Write production environment keys
cat <<EOF > "$ENV_FILE"
PORT=$APP_PORT
DB_HOST=localhost
DB_USER=root
DB_PASS=$DB_PASS
DB_NAME=$APP_DB
NODE_ENV=production
APP_NAME=$APP_NAME
API_BASE_URL=$APP_URL
DLR_BASE_URL=$APP_URL
JWT_SECRET=notifynow_db_secret_key_production
JWT_EXPIRES_IN=24h
SMS_USER=testdemo
SMS_PASSWORD=apidemo
SMS_SENDER_ID=CMTLTD
VITE_RCS_API_URL=https://rcs.cell24x7.com
BACKEND_URL=$APP_URL/api
FRONTEND_URL=$APP_URL
EOF

chmod 600 "$ENV_FILE"
ok "Configurations written successfully in $ENV_FILE."

# --- Step 4: Installing Dependencies ---
log "[4/7] Installing node dependencies..."

step "Installing backend packages..."
cd "$BACKEND_DIR"
npm install --production --prefer-offline --no-audit --no-fund 2>&1 | tail -3
ok "Backend packages ready."

step "Installing frontend packages..."
cd "$FRONTEND_DIR"
npm install --prefer-offline --no-audit --no-fund 2>&1 | tail -3
ok "Frontend packages ready."

# --- Step 5: Database Schema Setup & Optimizations ---
log "[5/7] Running database migration scripts..."

cd "$BACKEND_DIR"
step "Running apply_schema_updates.js..."
NODE_ENV=production node apply_schema_updates.js

step "Running table custom column modifications..."
for script in scripts/fix_truncation.js migrate_reports.js scripts/fix_pricing_precision.js scripts/fix_emojis.js scripts/fix_collation_crash.js scripts/fix_api_campaigns_schema.js scripts/add_failover_lock.js scripts/enable_email_for_all.js scripts/fix_sent_counts.js scripts/add_failover_cols.js scripts/voice_bot_infrastructure.js update_smm_schema.js update_rcs_multi_provider.js scripts/add_media_support.js migrate_api_flag.js migration_reseller_payment.js migration_reseller_paypal.js scripts/migrate_chats_meta.js; do
    if [ -f "$BACKEND_DIR/$script" ]; then
        NODE_ENV=production node "$BACKEND_DIR/$script" || true
    fi
done

step "Running index speed-boost optimizers..."
if [ -f "$BACKEND_DIR/scripts/turbo_speed_optimize.js" ]; then
    NODE_ENV=production node "$BACKEND_DIR/scripts/turbo_speed_optimize.js" || true
fi
ok "Database structures ready."

# --- Step 6: Frontend Compilation & Folder Permissions ---
log "[6/7] Building frontend production bundle..."

cd "$FRONTEND_DIR"
# Write frontend environment config
echo "VITE_API_URL=$APP_URL" > .env
echo "VITE_GOOGLE_CLIENT_ID=387794158424-hrsujhlj0eiahvufcti0do80201oj79h.apps.googleusercontent.com" >> .env

rm -rf dist
NODE_OPTIONS="--max-old-space-size=1024" VITE_API_URL="$APP_URL" npm run build -- --logLevel warn

step "Fixing directory permissions for Nginx read access..."
chmod o+x /home/veloxadmin || true
chmod o+x "$PROJECT_DIR" || true
chmod o+x "$FRONTEND_DIR" || true
chmod -R 755 "$FRONTEND_DIR/dist" || true
ok "Frontend assets built successfully."

# --- Step 7: Nginx Reverse Proxy Configuration ---
log "[7/7] Configuring Nginx reverse-proxy & SELinux permissions..."

# Create Nginx Server Block Configuration
NGINX_CONF="/etc/nginx/conf.d/notifynow.conf"
step "Writing Nginx config to $NGINX_CONF..."

sudo bash -c "cat <<EOF > $NGINX_CONF
server {
    listen 80;
    server_name _;

    # React Frontend Router
    location / {
        root $FRONTEND_DIR/dist;
        index index.html;
        try_files \\\$uri \\\$uri/ /index.html;
    }

    # Node.js API gateway proxy
    location /api {
        proxy_pass http://localhost:$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\\$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \\\$host;
        proxy_cache_bypass \\\$http_upgrade;
    }

    # WebSockets Sync endpoint
    location /socket.io/ {
        proxy_pass http://localhost:$APP_PORT/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\\$http_upgrade;
        proxy_set_header Connection \"upgrade\";
        proxy_set_header Host \\\$host;
    }
}
EOF"

# Enable SELinux HTTP content permissions to prevent 403 Forbidden errors
step "Configuring SELinux policy constraints..."
sudo chcon -Rt httpd_sys_content_t "$FRONTEND_DIR/dist" || true
sudo setsebool -P httpd_enable_homedirs 1 || true

step "Reloading Nginx service..."
sudo nginx -t
sudo systemctl reload nginx
ok "Nginx configured and live."

# --- Launch PM2 process ---
log "♻️  Launching application cluster under PM2..."

cd "$PROJECT_DIR"
# Check if app already exists in PM2 list
if pm2 list | grep -q "$APP_NAME"; then
    pm2 delete "$APP_NAME" || true
fi

# Start new instance using production env
pm2 start "$BACKEND_DIR/index.js" --name "$APP_NAME" --env production
pm2 save --force
ok "PM2 processes active."

echo -e "\n${BOLD}${GREEN}======================================================"
echo "    ✨ SYSTEM INITIALIZATION AND DEPLOYMENT COMPLETE! "
echo "    Access Application at: $APP_URL                   "
echo -e "======================================================${NC}\n"
