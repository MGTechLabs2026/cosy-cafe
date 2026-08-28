#!/usr/bin/env bash
# Build the production web bundle and assemble the itch.io HTML5 upload.
#
# itch.io serves the uploaded zip INSIDE an iframe under a project subpath, so
# the archive must place index.html at its ROOT (not nested in a subfolder) and
# every asset path must resolve relative (vite base './' + import.meta.env.BASE_URL
# at runtime already guarantee this). Usage: bash scripts/package_itch.sh
#
# Outputs:
#   releases/cosy-cafe-mvp-itch/   (the web build, index.html at root)
#   cosy-cafe-mvp-itch.zip         (the upload — index.html at zip root)
set -euo pipefail
cd "$(dirname "$0")/.."

npm run build
node scripts/verify_dist_paths.mjs

rm -rf releases/cosy-cafe-mvp-itch
mkdir -p releases/cosy-cafe-mvp-itch
cp -R dist/. releases/cosy-cafe-mvp-itch/

rm -f cosy-cafe-mvp-itch.zip
# Zip from INSIDE the build dir so index.html lands at the zip root.
( cd releases/cosy-cafe-mvp-itch && zip -qr ../../cosy-cafe-mvp-itch.zip . )

echo "---- releases/cosy-cafe-mvp-itch/ ----"
find releases/cosy-cafe-mvp-itch -type f | sort
echo "zip path: $(pwd)/cosy-cafe-mvp-itch.zip"
du -h cosy-cafe-mvp-itch.zip
