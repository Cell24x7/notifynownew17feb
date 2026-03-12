#!/bin/bash

# =========================================
# 🚀 NotifyNow Auto Deploy Script
# Usage: just type "up" in terminal
# =========================================

PROJECT_DIR="/home/adm.Cell24X7/developer.notifynow.in/notifynow"
REMOTE_REPO="git@github.com:Cell24x7/notifynownew17feb.git"
FRONTEND_DIR="$PROJECT_DIR/frontend"
BACKEND_DIR="$PROJECT_DIR/backend"

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

# ── Step 2: Set Git Remote to SSH ────────────
echo ""
echo "🔗 [2/6] Setting Git remote to SSH..."
git remote set-url origin "$REMOTE_REPO"
echo "   ✅ Remote set: $REMOTE_REPO"

# ── Step 3: Pull Latest Code ──────────────────
echo ""
echo "📥 [3/6] Pulling latest code from GitHub (main)..."
git fetch origin main
git reset --hard origin/main
if [ $? -eq 0 ]; then
    echo "   ✅ Code updated successfully!"
    echo "   📌 Latest commit: $(git log -1 --pretty=format:'%h - %s (%ar)')"
else
    echo "   ❌ Git pull failed! Check SSH keys or network."
    exit 1
fi

# ── Step 4: Build Frontend ────────────────────
echo ""
echo "🏗️  [4/6] Building frontend (npm run build)..."
if [ -d "$FRONTEND_DIR" ]; then
    cd "$FRONTEND_DIR"
    npm run build
    if [ $? -eq 0 ]; then
        echo "   ✅ Frontend build successful!"
    else
        echo "   ❌ Frontend build FAILED! Check for TypeScript/build errors."
        exit 1
    fi
    cd "$PROJECT_DIR"
else
    echo "   ⚠️  Frontend directory not found. Skipping build."
fi

# ── Step 5: Run DB Migrations (if any) ───────
echo ""
echo "🗄️  [5/6] Checking for DB migrations..."
if [ -f "backend/migration_fix_template_type.js" ]; then
    node backend/migration_fix_template_type.js
    echo "   ✅ Migration ran successfully."
else
    echo "   ℹ️  No migration script found. Skipping."
fi

# ── Step 6: Restart Backend via PM2 ──────────
echo ""
echo "♻️  [6/6] Restarting PM2 processes..."
if command -v pm2 &> /dev/null; then
    pm2 restart all --update-env
    echo "   ✅ PM2 restarted!"
    echo ""
    pm2 list
else
    echo "   ⚠️  PM2 not found. Restart Node manually."
fi

echo ""
echo "=========================================="
echo "  ✨ DEPLOYMENT COMPLETE! 🎉              "
echo "  🌐 https://developer.notifynow.in       "
echo "=========================================="
echo ""
