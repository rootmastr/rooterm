#!/bin/bash

# RooTerm Git Push Script 🚀

REPO_URL="git@github.com:rootmastr/rooterm.git"

echo "Checking Git initialization..."

# Initialize git if not already done
if [ ! -d ".git" ]; then
    echo "Initializing Git repository..."
    git init
    git branch -M main
fi

# Add remote if not already exists
if ! git remote | grep -q "origin"; then
    echo "Adding remote origin: $REPO_URL"
    git remote add origin $REPO_URL
else
    echo "Remote origin already exists. Updating URL..."
    git remote set-url origin $REPO_URL
fi

# Add all changes
echo "Adding changes..."
git add .

# Prompt for commit message or use default
COMMIT_MSG=${1:-"Update RooTerm: Prepare for deployment on port 8087"}

echo "Commiting changes with message: '$COMMIT_MSG'..."
git commit -m "$COMMIT_MSG"

# Push to main branch
echo "Pushing to GitHub (main)..."
git push -u origin main

echo "Done! ✅"
