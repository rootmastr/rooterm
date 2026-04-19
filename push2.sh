#!/bin/bash
# Simpan di root folder project Laptop

echo "🚀 Memulai proses push ke GitHub..."

# 1. Tambahkan semua perubahan
git add .

# 2. Commit dengan pesan otomatis atau manual
MESSAGE=${1:-"Update RooTerm: Fix CORS and permission issues"}
git commit -m "$MESSAGE"

# 3. Push ke branch main
git push origin main

echo "✅ Berhasil update ke GitHub!"

