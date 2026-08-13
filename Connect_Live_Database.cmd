@echo off
title Connect to Live Database (NotifyNow)
echo ========================================================
echo 🚀 CONNECTING TO NOTIFYNOW LIVE PRODUCTION DATABASE...
echo ========================================================
echo.

:: 1. Import HeidiSQL Registry Session
echo 📌 Registering HeidiSQL Connection Settings...
reg import "%~dp0HeidiSQL_LiveServer_Session.reg" >nul 2>&1

:: 2. Ensure Background SSH Tunnel is Active
echo 📌 Activating SSH Tunnel on Port 3307...
start /b node "%~dp0scratch_ssh\local_tunnel.js" >nul 2>&1

:: 3. Launch HeidiSQL
echo 📌 Opening HeidiSQL...
if exist "C:\Program Files\HeidiSQL\heidisql.exe" (
    start "" "C:\Program Files\HeidiSQL\heidisql.exe" -d=CELL24X7_C31757_Live
    echo ✅ Connected! HeidiSQL opened.
    exit /b
)

if exist "C:\Program Files (x86)\HeidiSQL\heidisql.exe" (
    start "" "C:\Program Files (x86)\HeidiSQL\heidisql.exe" -d=CELL24X7_C31757_Live
    echo ✅ Connected! HeidiSQL opened.
    exit /b
)

if exist "%LOCALAPPDATA%\Programs\HeidiSQL\heidisql.exe" (
    start "" "%LOCALAPPDATA%\Programs\HeidiSQL\heidisql.exe" -d=CELL24X7_C31757_Live
    echo ✅ Connected! HeidiSQL opened.
    exit /b
)

start heidisql.exe -d=CELL24X7_C31757_Live 2>nul
echo ✅ HeidiSQL session registered. Click Open in HeidiSQL.
