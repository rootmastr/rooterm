#!/bin/bash
set -e

echo "🚀 RooTerm Push to GitHub"

# Check if there are changes
if [ -z "$(git status --porcelain)" ]; then
    echo "✅ No changes to commit"
    exit 0
fi

# Show status
echo "📋 Changes:"
git status --short

# Add all
git add .

# Commit with message or default
MESSAGE=${1:-"deploy: $(date +'%Y-%m-%d %H:%M')"}
git commit -m "$MESSAGE"

# Push to GitHub
echo "📤 Pushing to GitHub..."
git push origin main

echo "✅ Done! Server can now pull changes."
