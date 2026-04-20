#!/bin/bash
# RooTerm Pro Deployment Script 🚀 (Branch: MASTER)

set -e # Berhenti jika ada error

echo "Starting Deployment Process..."

# 1. Perbaikan Izin Git (wajib di aaPanel)
echo "Setting up safe directory..."
git config --global --add safe.directory /www/wwwroot/rootmastr.space || true

# 2. Ambil Kode Terbaru dari MASTER (Force Update)
echo "Pulling latest changes from Git (master)..."
git fetch --all
git reset --hard origin/master

# 3. Optimasi NPM & Fix aaPanel .user.ini
echo "Configuring NPM..."
npm config set registry https://registry.npmjs.org/
[ -f "dist/.user.ini" ] && chattr -i dist/.user.ini || true
mkdir -p /www/server/nodejs/cache/_logs
chmod -R 777 /www/server/nodejs/cache 2>/dev/null || true

# 4. Clean, Install & Build Frontend
echo "Building Frontend..."
rm -rf dist
npm install

# Paksa URL API masuk ke build (Port 3001)
export VITE_API_URL="http://rootmastr.space:3001"
VITE_API_URL=http://rootmastr.space:3001 VITE_SOCKET_URL=http://rootmastr.space:3001 npm run build

# 5. Install Backend dependencies
echo "Installing Backend dependencies..."
cd server
npm install
cd ..

# 6. Pastikan file .env Backend ada
if [ ! -f "server/.env" ]; then
    echo "Creating default server/.env..."
    echo "JWT_SECRET=$(openssl rand -base64 32)" > server/.env
    echo "PORT=3001" >> server/.env
    echo "NODE_ENV=production" >> server/.env
fi

# 7. Restart Backend (PM2)
echo "Restarting service with PM2..."
pm2 restart rooterm-backend || pm2 start server/index.js --name "rooterm-backend"
pm2 save

echo "Deployment Finished! ✅"
echo "Akses di: http://rootmastr.space:8087"
