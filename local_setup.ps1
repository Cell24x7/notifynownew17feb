# =========================================================
# 🚀 NotifyNow LOCAL Windows Setup Script (PowerShell)
# - Configures local .env with Port 5000
# - Installs missing backend dependencies
# - Restarts the local server via PM2
# =========================================================

$ErrorActionPreference = "Stop"

$ProjectDir = Get-Location
$BackendDir = Join-Path $ProjectDir "backend"
$FrontendDir = Join-Path $ProjectDir "frontend"

# 📦 LOCAL SETTINGS
$AppName = "notifynow-local"
$Port = 5000
$DbUser = "root"
$DbPass = ""
$DbName = "notifynow_db"
$AppUrl = "http://localhost:5000"

Write-Host "🚀 Starting NATIVE Windows Setup..." -ForegroundColor Cyan

# 1. Setting up Local Environment (Backend)
Write-Host "[1/4] Syncing Backend .env file..." -ForegroundColor Yellow
$BackendEnv = @"
PORT=$Port
DB_HOST=localhost
DB_USER=$DbUser
DB_PASS=$DbPass
DB_NAME=$DbName
NODE_ENV=development
APP_NAME=$AppName
API_BASE_URL=$AppUrl
JWT_SECRET=your_jwt_secret_for_local_development
"@
$BackendEnv | Out-File -FilePath (Join-Path $BackendDir ".env") -Encoding ascii

# 2. Dependencies
Write-Host "[2/4] Installing backend dependencies (Fixing missing modules)..." -ForegroundColor Yellow
Set-Location $BackendDir
npm install --silent

# 3. Frontend Environment Setup
Write-Host "[3/4] Syncing Frontend .env file..." -ForegroundColor Yellow
$FrontendEnv = @"
VITE_API_URL=$AppUrl
VITE_GOOGLE_CLIENT_ID=387794158424-hrsujhlj0eiahvufcti0do80201oj79h.apps.googleusercontent.com
"@
$FrontendEnv | Out-File -FilePath (Join-Path $FrontendDir ".env") -Encoding ascii

# Ensure nodemon is installed for local dev
if (!(Get-Command nodemon -ErrorAction SilentlyContinue)) {
    Write-Host "Nodemon not found. Installing globally..." -ForegroundColor Yellow
    & npm install -g nodemon
}

# 4. Starting Local Server
Write-Host "[4/4] Starting Local Server via Nodemon..." -ForegroundColor Yellow
Set-Location $BackendDir

# Find and kill any process on port 5000 if it exists
$process = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
if ($process) {
    Write-Host "Stopping existing process on port $Port..." -ForegroundColor Gray
    Stop-Process -Id $process.OwningProcess -Force -ErrorAction SilentlyContinue
}

# Start the server
npm run dev

Write-Host "`n✨ LOCAL SETUP COMPLETE!" -ForegroundColor Green
Write-Host "👉 Backend Running at: http://localhost:$Port" -ForegroundColor Gray
Write-Host "👉 Frontend (Run separately): cd frontend; npm run dev" -ForegroundColor Gray
Write-Host ""
