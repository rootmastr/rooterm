# RooTerm Deployment Guide 🚀

Panduan ini berisi langkah-langkah teknis untuk melakukan deployment aplikasi RooTerm ke server produksi (VPS).

---

## 1. Persiapan Server (VPS)
Gunakan Ubuntu 22.04 LTS atau lebih baru.

### Update & Install Dependencies
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y nodejs npm nginx git
sudo npm install -g pm2
```

### Konfigurasi Firewall (UFW)
```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp
sudo ufw enable
```

---

## 2. Persiapan Kode & Build
Lakukan langkah ini di lingkungan lokal sebelum upload atau langsung di server.

### Backend Setup
1. Masuk ke folder `server`.
2. Install dependencies: `npm install`.
3. Buat file `.env` dan isi dengan:
   ```env
   JWT_SECRET=Gunakan_String_RAHASIA_Sangat_Panjang
   PORT=3001
   NODE_ENV=production
   ```

### Frontend Build
1. Update URL API di frontend:
   - Cari semua `http://localhost:3001` di folder `src/` dan ganti dengan domain Anda (misal: `https://api.domainanda.com`).
2. Jalankan build di root folder:
   ```bash
   npm install
   npm run build
   ```
3. Hasil build akan ada di folder `dist`.

---

## 3. Deployment Backend
Gunakan PM2 agar server tetap berjalan di background.

```bash
cd server
pm2 start index.js --name "rooterm-backend"
pm2 save
pm2 startup
```

---

## 4. Konfigurasi Nginx (Reverse Proxy & Static Hosting)
Buat file konfigurasi baru di `/etc/nginx/sites-available/rooterm`.

```nginx
server {
    listen 80;
    server_name domainanda.com; # GANTI DENGAN DOMAIN ANDA

    # Serving Frontend Static Files
    location / {
        root /var/www/rooterm/dist; # SESUAIKAN DENGAN PATH DIST ANDA
        try_files $uri $uri/ /index.html;
    }

    # API Routes
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Socket.io Support
    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
```

Aktifkan konfigurasi:
```bash
sudo ln -s /etc/nginx/sites-available/rooterm /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 5. Keamanan & SSL (Wajib)
Gunakan Certbot untuk mendapatkan sertifikat SSL gratis.

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d domainanda.com
```

---

## 6. Tips Keamanan Tambahan 🛡️
1. **Password Strong**: Ganti hash password di `server/data/users.json`.
2. **Fail2Ban**: Install `fail2ban` untuk mencegah brute force pada SSH VPS Anda.
3. **CORS Hardening**: Di `server/index.js`, ganti `origin: '*'` menjadi domain spesifik Anda.
4. **Ollama Access**: Pastikan IP Ollama `120.120.120.85` diizinkan di firewall VPS Anda.

---

*Panduan dibuat pada: 2026-04-11*
