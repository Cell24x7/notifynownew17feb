#!/bin/bash

# =========================================================
# 🚀 NotifyNow PRODUCT Deploy Script
# - Handles both Git Push and Server Deployment
# =========================================================

# Exit on error
set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}  🚀 NotifyNow Production Push & Deploy   ${NC}"
echo -e "${BLUE}==========================================${NC}"

# Step 1: Git Push
echo -e "${YELLOW}📥 Step 1: Committing and Pushing to Git...${NC}"
git add .
read -p "Enter commit message: " commit_msg
if [ -z "$commit_msg" ]; then
    commit_msg="Update: Production fixes $(date +'%Y-%m-%d %H:%M')"
fi
git commit -m "$commit_msg" || echo "Nothing to commit"
git push origin main
echo -e "${GREEN}✅ Pushed to origin main successfully.${NC}"

# Step 2: Build & Deployment (Local check or Server Trigger)
echo -e "${YELLOW}🏗️  Step 2: Preparing production environment...${NC}"

# Check if deploy_production.sh exists
if [ -f "./deploy_production.sh" ]; then
    echo -e "${BLUE}🔄 Executing deploy_production.sh...${NC}"
    # Use bash to run it in case permissions are not set
    bash ./deploy_production.sh
else
    echo -e "${RED}❌ deploy_production.sh not found!${NC}"
    echo -e "${YELLOW}Manual steps required on server:${NC}"
    echo "1. git pull origin main"
    echo "2. cd backend && npm install && pm2 restart index.js"
    echo "3. cd frontend && npm install && npm run build"
fi

echo -e "${GREEN}✨ PRODUCT DEPLOYMENT INITIATED SUCCESSFULLY!${NC}"
