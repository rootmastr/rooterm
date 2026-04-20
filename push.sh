#!/bin/bash
# RooTerm Smart Push 🚀

# Pastikan berada di branch master
git branch -m main master 2>/dev/null || true
git checkout master 2>/dev/null || git checkout -b master

# Tambahkan perubahan
git add .

# Pesan commit dengan waktu
TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")
COMMIT_MSG=${1:-"Auto-Update: $TIMESTAMP"}

echo "--- 📤 Mengirim perubahan ke GitHub... ---"
git commit -m "$COMMIT_MSG"
git push origin master -f

echo "--- ✅ Selesai! Silakan jalankan 'bash update.sh' di server ---"
