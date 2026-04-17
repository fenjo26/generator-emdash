#!/bin/bash
# server-build-all.sh — builds ALL sites on the VPS
#
# Scans /home/work/web/ and builds every domain
# that has a public_html/DOMAIN/text/main.txt file.
#
# Usage:
#   bash server-build-all.sh              # build all
#   bash server-build-all.sh topo-mole.gr avia-master.gr   # specific domains only

GENERATOR_DIR="$(cd "$(dirname "$0")" && pwd)"
WEB_ROOT="/home/work/web"
SCRIPT="$GENERATOR_DIR/server-build.sh"

SUCCESS=()
FAILED=()

# If specific domains passed — use them; otherwise scan all
if [ $# -gt 0 ]; then
  DOMAINS=("$@")
else
  DOMAINS=()
  for dir in "$WEB_ROOT"/*/; do
    domain=$(basename "$dir")
    input="$dir/public_html/$domain"
    [ -f "$input/text/main.txt" ] && DOMAINS+=("$domain")
  done
fi

if [ ${#DOMAINS[@]} -eq 0 ]; then
  echo "❌ No sites found in $WEB_ROOT"
  exit 1
fi

echo "🔎 Found ${#DOMAINS[@]} sites: ${DOMAINS[*]}"
echo ""

for domain in "${DOMAINS[@]}"; do
  if bash "$SCRIPT" "$domain"; then
    SUCCESS+=("$domain")
  else
    echo "⚠️  Failed: $domain"
    FAILED+=("$domain")
  fi
  echo ""
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Built (${#SUCCESS[@]}): ${SUCCESS[*]}"
[ ${#FAILED[@]} -gt 0 ] && echo "❌ Failed (${#FAILED[@]}): ${FAILED[*]}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
