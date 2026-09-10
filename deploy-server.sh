#!/bin/bash
set -e # Berhenti jika ada error

# RooTerm Server Deployment Script
# Server IP: 111.68.31.232 | Domain: rootmastr.space
# Frontend: port 8087 | Backend: port 3001

SERVER_IP="111.68.31.232"
DOMAIN="rootmastr.space"
FRONTEND_PORT=8087
BACKEND_PORT=3001

echo "🚀 RooTerm Deployment Starting..."

# 1. Perbaikan Izin Git (wajib di aaPanel)
echo "Setting up safe directory..."
git config --global --add safe.directory /www/wwwroot/rootmastr.space || true

# 2. Ambil Kode Terbaru dari GitHub
echo "Pulling latest changes from Git..."
git fetch --all
git reset --hard origin/main

# 3. Check prerequisites
command -v node >/dev/null 2>&1 || { echo "❌ Node.js not installed"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "❌ npm not installed"; exit 1; }
command -v pm2 >/dev/null 2>&1 || { echo "❌ PM2 not installed. Run: npm install -g pm2"; exit 1; }

# 4. Optimasi NPM & Fix aaPanel
echo "Configuring NPM..."
npm config set registry https://registry.npmjs.org/
npm config delete init-module -g 2>/dev/null || true
[ -f "dist/.user.ini" ] && chattr -i dist/.user.ini || true
mkdir -p /www/server/nodejs/cache/_logs 2>/dev/null || true
chmod -R 777 /www/server/nodejs/cache 2>/dev/null || true

# 5. Clean, Install & Build Frontend
echo "📦 Building Frontend..."
rm -rf dist
npm install

# Build dengan URL API yang benar
VITE_API_URL="http://${DOMAIN}:${BACKEND_PORT}" \
VITE_SOCKET_URL="http://${DOMAIN}:${BACKEND_PORT}" \
npm run build

# 6. Install Backend dependencies
echo "📦 Installing Backend..."
cd server
npm install
cd ..

# 7. Setup Backend .env
if [ ! -f "server/.env" ]; then
    echo "⚙️  Creating server/.env..."
    cat > server/.env << EOF
JWT_SECRET=$(openssl rand -base64 32)
PORT=${BACKEND_PORT}
NODE_ENV=production
OLLAMA_URL=http://localhost:11434
EOF
    echo "⚠️  .env created. Review and adjust OLLAMA_URL if needed."
fi

# 8. Restart Backend (PM2)
echo "🔄 Restarting Backend with PM2..."
pm2 restart rooterm-backend || pm2 start server/index.js --name "rooterm-backend"
pm2 save

echo ""
echo "========================================="
echo "✅ Deployment Complete!"
echo "========================================="
echo "Frontend:  http://${DOMAIN}:${FRONTEND_PORT}"
echo "Backend:   http://${DOMAIN}:${BACKEND_PORT}"
echo "Health:    http://${DOMAIN}:${BACKEND_PORT}/health"
echo "========================================="
echo ""
echo "📋 PM2 Status:"
pm2 list
