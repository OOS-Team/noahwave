#!/bin/zsh
set -e
cd "$(dirname "$0")"
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

echo "=== NoahWave media upload ==="
echo ""
echo "You need a GitHub Personal Access Token (free)."
echo "1. Open: https://github.com/settings/tokens"
echo "2. Generate new token (classic)"
echo "3. Check the 'repo' scope"
echo "4. Generate and copy the token"
echo ""
echo -n "Paste token here (input hidden): "
read -s GITHUB_TOKEN
echo ""
export GITHUB_TOKEN

if [ -z "$GITHUB_TOKEN" ]; then
  echo "No token entered. Aborting."
  exit 1
fi

echo "Uploading ~32MB gallery + face models + full source..."
node scripts/push-assets.mjs
echo ""
echo "Done. Vercel will redeploy in ~1-2 minutes."
echo "Then refresh your live site."
