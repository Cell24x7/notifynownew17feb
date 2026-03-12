#!/bin/bash

# =========================================
# 🚀 NotifyNow Auto Deploy Script
# Usage: just type "up" in terminal
# AUTO: uses .env.production on server!
# =========================================

PROJECT_DIR="/home/adm.Cell24X7/developer.notifynow.in/notifynow"
REMOTE_REPO="git@github.com:Cell24x7/notifynownew17feb.git"
FRONTEND_DIR="$PROJECT_DIR/frontend"
LOGS_DIR="$PROJECT_DIR/logs"

echo ""
echo "=========================================="
echo "  🚀 NotifyNow Deployment Starting...     "
echo "=========================================="
echo ""

# ── Step 1: Go to Project Directory ──────────
echo "📂 [1/6] Navigating to project directory..."
if [ -d "$PROJECT_DIR" ]; then
    cd "$PROJECT_DIR"
    echo "   ✅ In: $(pwd)"
else
    echo "   ❌ ERROR: Directory $PROJECT_DIR not found!"
    exit 1
fi

# Make sure logs dir exists
mkdir -p "$LOGS_DIR"

# ── Step 2: Set Git Remote to SSH ────────────
echo ""
echo "🔗 [2/6] Setting Git remote to SSH..."
git remote set-url origin "$REMOTE_REPO"
echo "   ✅ Remote: $REMOTE_REPO"

# ── Step 3: Pull Latest Code ──────────────────
echo ""
echo "📥 [3/6] Pulling latest code from GitHub (main)..."
git fetch origin main
git reset --hard origin/main
if [ $? -eq 0 ]; then
    echo "   ✅ Code updated!"
    echo "   📌 Commit: $(git log -1 --pretty=format:'%h - %s (%ar)')"
else
    echo "   ❌ Git pull failed! Check SSH keys."
    exit 1
fi

# ── Step 4: Build Frontend ────────────────────
echo ""
echo "🏗️  [4/6] Building frontend..."
if [ -d "$FRONTEND_DIR" ]; then
    cd "$FRONTEND_DIR"
    npm run build
    if [ $? -eq 0 ]; then
        echo "   ✅ Frontend build done!"
    else
        echo "   ❌ Frontend build FAILED!"
        exit 1
    fi
    cd "$PROJECT_DIR"
else
    echo "   ⚠️  Frontend dir not found. Skipping."
fi

# ── Step 5: Run DB Migrations ─────────────────
echo ""
echo "🗄️  [5/6] Checking DB migrations..."
if [ -f "backend/migration_fix_template_type.js" ]; then
    NODE_ENV=production node backend/migration_fix_template_type.js
    echo "   ✅ Migration done."
else
    echo "   ℹ️  No migration script. Skipping."
fi

# ── Step 6: Restart with PM2 (PRODUCTION ENV) ─
echo ""
echo "♻️  [6/6] Restarting with PM2 (NODE_ENV=production)..."
if command -v pm2 &> /dev/null; then

    # Check if app already running
    if pm2 list | grep -q "notifynow"; then
        echo "   🔄 App running — restarting with production env..."
        pm2 restart ecosystem.config.js --env production --update-env
    else
        echo "   🆕 First start — launching with production env..."
        pm2 start ecosystem.config.js --env production
    fi

    pm2 save
    echo "   ✅ PM2 started with NODE_ENV=production"
    echo "   📋 Using: .env.production (DB: developer_notify)"
    echo ""
    pm2 list

else
    echo "   ⚠️  PM2 not found! Installing..."
    npm install -g pm2
    pm2 start ecosystem.config.js --env production
    pm2 save
fi

echo ""
echo "=========================================="
echo "  ✨ DEPLOYMENT COMPLETE! 🎉              "
echo "  🌐 https://developer.notifynow.in       "
echo "  🗄️  DB: developer_notify (production)   "
echo "  📄 ENV: .env.production ✅              "
echo "=========================================="
echo ""
