#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> Checking git..."
if ! git --version >/dev/null 2>&1; then
  echo "git is blocked. Run:  sudo xcodebuild -license accept"
  exit 1
fi

REPO_URL="${1:-https://github.com/OOS-Team/noahwave.git}"

if [ ! -d .git ]; then
  git init
  git branch -M main
fi

git remote remove origin 2>/dev/null || true
git remote add origin "$REPO_URL"

# Ensure media is real (not symlinks)
if [ -L public/gallery ] || [ -L public/images ] || [ -L public/models ]; then
  echo "WARNING: public media still looks like symlinks. Copy real files before push."
fi

npm run generate:works

git add -A
git status

git commit -m "NoahWave: full cypher archive (source + media)" || echo "(nothing new to commit?)"

echo "==> Pushing to $REPO_URL"
git push -u origin main

echo ""
echo "Done → https://github.com/OOS-Team/noahwave"
echo "Next: import that repo on https://vercel.com"
