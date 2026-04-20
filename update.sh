#!/bin/bash
# RooTerm Quick Update Script 🚀

echo "--- 🔄 Memulai Update di Server ---"
cd /www/wwwroot/rootmastr.space

# Ambil kode terbaru dari GitHub
git fetch --all
git reset --hard origin/master

# Perbaikan permission aaPanel
[ -f "dist/.user.ini" ] && chattr -i dist/.user.ini || true

# Install & Build Frontend
echo "--- 🛠️ Building Frontend ---"
npm install
VITE_API_URL=http://rootmastr.space:8087 VITE_SOCKET_URL=http://rootmastr.space:8087 npm run build

# Install & Restart Backend
echo "--- 🔄 Restarting Backend with PM2 ---"
cd server && npm install && cd ..
pm2 delete all || true
pm2 start server/index.js --name "rooterm-backend"
pm2 save

echo "--- ✅ Update Berhasil! ---"
echo "Silakan cek di: http://rootmastr.space:8087"
