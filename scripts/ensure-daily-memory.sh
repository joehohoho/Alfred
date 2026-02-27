#!/usr/bin/env bash
set -euo pipefail

MEMORY_DIR="$HOME/.openclaw/workspace/memory"
mkdir -p "$MEMORY_DIR"

DATE_STR="$(TZ=America/Moncton date +%F)"
FILE="$MEMORY_DIR/${DATE_STR}.md"

if [[ ! -f "$FILE" ]]; then
  cat > "$FILE" <<EOF
# Daily Memory — ${DATE_STR}

## Notes

EOF
  echo "created:$FILE"
else
  echo "exists:$FILE"
fi
