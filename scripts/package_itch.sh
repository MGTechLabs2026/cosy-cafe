#!/usr/bin/env bash
# M4 launch packaging — build dist/ and assemble dist-itch/ per doc 07 §3.
# The itch HTML5 upload is a zip whose ROOT holds index.html; itch serves it
# inside an iframe under a subpath, which is why vite base is './' and every
# runtime path resolves relative. Usage: bash scripts/package_itch.sh
set -euo pipefail
cd "$(dirname "$0")/.."

npm run build
node scripts/verify_dist_paths.mjs

rm -rf dist-itch
mkdir -p dist-itch/moonleaf-cafe
cp -R dist/. dist-itch/moonleaf-cafe/

cd dist-itch/moonleaf-cafe
zip -qr ../moonleaf-cafe-html5.zip .
cd ..

echo "---- dist-itch/ ----"
find . -type f | sort | head -30
echo "zip size:"
du -h moonleaf-cafe-html5.zip
