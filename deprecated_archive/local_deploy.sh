#!/bin/bash

# =========================================================
# 🚀 NotifyNow LOCAL PROJECT Setup Script
# - Configures local .env for Windows
# - Installs missing dependencies
# - Restarts the local development server
# =========================================================

set -e

PROJECT_DIR=$(pwd)
FRONTEND_DIR="$PROJECT_DIR/frontend"
BACKEND_DIR="$PROJECT_DIR/backend"

# 📦 LOCAL SETTINGS
APP_NAME="notifynow-local"
PORT=5000
DB_USER="root"
DB_PASS=""
DB_NAME="notifynow_db"
APP_URL="http://localhost:5000"

echo "🚀 Starting LOCAL Windows Setup..."

# 1. Setting up Local Environment (Force overwrite .env)
echo "[1/4] Syncing Local .env file..."
cd "$BACKEND_DIR"
cat > .env <<EOL
PORT=$PORT
DB_HOST=localhost
DB_USER=$DB_USER
DB_PASS=$DB_PASS
DB_NAME=$DB_NAME
NODE_ENV=development
APP_NAME=$APP_NAME
API_BASE_URL=$APP_URL
EOL

# 2. Dependencies
echo "[2/4] Installing backend dependencies (Fixing missing modules)..."
npm install --silent

# 3. Frontend Build (Optional for local dev, but good to have)
echo "[3/4] Building local frontend..."
cd "$FRONTEND_DIR"
# Ensure the frontend also points to localhost:5000
cat > .env <<EOL
VITE_API_URL=$APP_URL
VITE_GOOGLE_CLIENT_ID=387794158424-hrsujhlj0eiahvufcti0do80201oj79h.apps.googleusercontent.com
EOL
# npm run build  # Skip build for faster local start if you use dev server

# 4. Restart Local Server
echo "[4/4] Restarting Local Server..."
cd "$BACKEND_DIR"
pm2 delete $APP_NAME 2>/dev/null || true
pm2 start index.js --name $APP_NAME --watch --ignore-watch="node_modules logs"

pm2 save --force

echo ""
echo "✨ LOCAL SETUP COMPLETE!"
echo "👉 Backend: http://localhost:$PORT"
echo "👉 Frontend (Run separately): cd frontend && npm run dev"
echo ""
