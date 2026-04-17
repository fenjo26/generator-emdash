#!/bin/bash
# Mass generation: generates a site for every folder inside ./testseo/
#
# Usage:
#   bash generate-all.sh              # generates all sites
#   bash generate-all.sh --build      # generates + npm install + npm run build
#   bash generate-all.sh --deploy     # generates + build + deploy (runs deploy.sh in each site)
#
# Input:  ./testseo/
# Output: ./sites/

set -e

INPUT_DIR="./testseo"
OUTPUT_DIR="./sites"
MODE="${1:-}"

if [ ! -d "$INPUT_DIR" ]; then
  echo "❌ Folder $INPUT_DIR not found"
  exit 1
fi

SITES=()
for folder in "$INPUT_DIR"/*/; do
  [ -d "$folder" ] || continue
  SITES+=("$(basename "$folder")")
done

if [ ${#SITES[@]} -eq 0 ]; then
  echo "❌ No site folders found in $INPUT_DIR"
  exit 1
fi

echo "🔎 Found ${#SITES[@]} sites: ${SITES[*]}"
echo ""

for site in "${SITES[@]}"; do
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🚀 $site"

  node generate.js \
    --input  "$INPUT_DIR/$site" \
    --output "$OUTPUT_DIR/$site"

  if [ "$MODE" = "--build" ] || [ "$MODE" = "--deploy" ]; then
    echo "📦 npm install + build..."
    cd "$OUTPUT_DIR/$site"
    npm install --silent
    npm run build
    cd - > /dev/null
    echo "✅ Built: $OUTPUT_DIR/$site/dist/"
  fi

  if [ "$MODE" = "--deploy" ]; then
    echo "🌐 Deploying..."
    cd "$OUTPUT_DIR/$site"
    bash deploy.sh
    cd - > /dev/null
  fi

  echo ""
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ All done! ${#SITES[@]} sites processed."
