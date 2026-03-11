#!/bin/bash

# Configuration
PROJECT_DIR="/home/adm.Cell24X7/developer.notifynow.in/notifynow"
REMOTE_REPO="git@github.com:Cell24x7/notifynownew17feb.git"

echo "------------------------------------------"
echo "🚀 Starting Deployment Process..."
echo "------------------------------------------"

# 1. Navigating to Project Directory
if [ -d "$PROJECT_DIR" ]; then
    cd "$PROJECT_DIR"
    echo "📂 Directory: $(pwd)"
else
    echo "❌ Project directory $PROJECT_DIR not found!"
    exit 1
fi

# 2. Resetting Remote URL to use SSH (for easy pull)
echo "🔄 Updating Git Remote..."
git remote set-url origin "$REMOTE_REPO"

# 3. Fetching and Resetting to Main (Cleanest way to update)
echo "📥 Fetching and Pulling latest code..."
git fetch origin main
git reset --hard origin/main

# 4. Restarting Backend (PM2)
echo "♻️ Restarting Services..."
if command -v pm2 &> /dev/null; then
    pm2 restart all
    echo "✅ PM2 processes restarted."
else
    echo "⚠️ PM2 not found, please restart your node process manually."
fi

echo "------------------------------------------"
echo "✨ Update Successful!"
echo "------------------------------------------"
