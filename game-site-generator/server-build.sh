#!/bin/bash
# server-build.sh — builds ONE site on the VPS
#
# Usage:
#   bash server-build.sh topo-mole.gr
#   bash server-build.sh avia-master.gr
#
# Reads:   /home/work/web/DOMAIN/public_html/DOMAIN/  (txt files + images)
# Outputs: /home/work/web/DOMAIN/public_html/          (static HTML)

set -e

DOMAIN="${1:-}"
if [ -z "$DOMAIN" ]; then
  echo "Usage: bash server-build.sh <domain>"
  echo "Example: bash server-build.sh topo-mole.gr"
  exit 1
fi

# ── Paths ──────────────────────────────────────────────────────────────────
GENERATOR_DIR="$(cd "$(dirname "$0")" && pwd)"   # folder where generate.js lives
WEB_ROOT="/home/work/web"
INPUT="$WEB_ROOT/$DOMAIN/public_html/$DOMAIN"    # content: txt files + images
PUBLIC_HTML="$WEB_ROOT/$DOMAIN/public_html"      # web root served by Hestia
BUILD_DIR="/tmp/site-build/$DOMAIN"              # temp build folder

# ── Checks ──────────────────────────────────────────────────────────────────
if [ ! -d "$INPUT" ]; then
  echo "❌ Input folder not found: $INPUT"
  exit 1
fi

if [ ! -f "$INPUT/text/main.txt" ]; then
  echo "❌ No text/main.txt in $INPUT"
  exit 1
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔨 Building: $DOMAIN"
echo "   Input:  $INPUT"
echo "   Output: $PUBLIC_HTML"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── Generate ─────────────────────────────────────────────────────────────────
rm -rf "$BUILD_DIR"
node "$GENERATOR_DIR/generate.js" --input "$INPUT" --output "$BUILD_DIR"

# ── Install & Build ───────────────────────────────────────────────────────────
cd "$BUILD_DIR"
npm install --silent
npm run build

# ── Deploy dist/ → public_html/ (keep source subfolder untouched) ─────────
# --exclude=$DOMAIN prevents rsync from deleting the source folder
rsync -a --delete --exclude="$DOMAIN/" dist/ "$PUBLIC_HTML/"

echo ""
echo "✅ Done → https://$DOMAIN/"
