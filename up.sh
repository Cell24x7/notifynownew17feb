#!/bin/bash

# =========================================================
# 🚀 NotifyNow SMART Auto-Deployer
# Detects folder and runs the correct script
# =========================================================

CURRENT_DIR=$(pwd)

if [[ "$CURRENT_DIR" == *"developer.notifynow.in"* ]]; then
    echo -e "\e[1;34m[DETECTED] Developer Environment\e[0m"
    chmod +x deploy_server.sh
    ./deploy_server.sh
elif [[ "$CURRENT_DIR" == *"notifynow.in"* ]]; then
    echo -e "\e[1;32m[DETECTED] Production Environment\e[0m"
    chmod +x deploy_production.sh
    ./deploy_production.sh
else
    echo -e "\e[1;31m[ERROR] Unknown environment folder: $CURRENT_DIR\e[0m"
    echo "Please use this script inside 'notifynow.in' or 'developer.notifynow.in' folders."
    exit 1
fi
