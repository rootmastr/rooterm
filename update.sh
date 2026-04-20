#!/bin/bash
# RooTerm Quick Update Script 🚀

echo "--- 📥 Pulling latest code from GitHub (Master) ---"
git fetch --all
git reset --hard origin/master

echo "--- 📦 Installing dependencies ---"
npm install
cd server && npm install && cd ..

echo "--- 🛠️ Building Frontend ---"
# Pastikan URL API sudah benar (Port 3001)
export VITE_API_URL="http://rootmastr.space:3001"
VITE_API_URL=http://rootmastr.space:3001 VITE_SOCKET_URL=http://rootmastr.space:3001 npm run build

echo "--- 🔄 Restarting Services with PM2 ---"
pm2 restart rooterm-backend || pm2 start server/index.js --name "rooterm-backend"
pm2 save

echo "--- ✅ Update Complete! Website is live at http://rootmastr.space:8087 ---"
