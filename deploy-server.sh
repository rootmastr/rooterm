#!/bin/bash

# RooTerm Deployment Script for Server 🚀
# Run this on your server after git clone

echo "Starting Deployment Process..."

# Force NPM to use official registry and fix aaPanel quirks
npm config set registry https://registry.npmjs.org/
npm config delete init.module -g
npm config delete init-module -g

# Fix aaPanel cache permission issues
mkdir -p /www/server/nodejs/cache/_logs
chmod -R 777 /www/server/nodejs/cache 2>/dev/null || true

# 1. Install Dependencies for Root (Vite)
echo "Installing Frontend dependencies..."
npm install

# 2. Build Frontend
echo "Building Frontend..."
npm run build

# 3. Install Dependencies for Server (Backend)
echo "Installing Backend dependencies..."
cd server
npm install
cd ..

# 4. Environment Setup (Optional/Manual)
if [ ! -f "server/.env" ]; then
    echo "Warning: server/.env not found. Creating a default one..."
    echo "JWT_SECRET=$(openssl rand -base64 32)" > server/.env
    echo "PORT=3001" >> server/.env
    echo "NODE_ENV=production" >> server/.env
fi

# 5. Restart Services (PM2)
# Assumes you have already added the project to aaPanel or running manually via PM2
echo "Restarting Backend with PM2..."
pm2 restart rooterm-backend || pm2 start server/index.js --name "rooterm-backend"

echo "Deployment Finished! ✅"
echo "Check http://111.68.31.232:8087"
