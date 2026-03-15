#!/bin/bash
# memory-smart-archive.sh
# Smart archival of old MEMORY.md entries
# Safety: dry-run by default, requires "apply" to make changes

set -e

MEMORY_FILE="$HOME/.openclaw/workspace/MEMORY.md"
ARCHIVE_FILE="$HOME/.openclaw/workspace/memory/MEMORY-ARCHIVE.md"
MODE="${1:-dry-run}"
TIMESTAMP=$(date '+%Y-%m-%dT%H:%M:%S%z')

# Safety: ensure files exist
mkdir -p "$(dirname "$ARCHIVE_FILE")"
touch "$MEMORY_FILE" "$ARCHIVE_FILE"

BEFORE_SIZE=$(wc -c < "$MEMORY_FILE")

echo "[$TIMESTAMP] Memory archival dry-run:"
echo "  Current MEMORY.md size: $BEFORE_SIZE bytes"
echo ""
echo "  Preserved sections:"
echo "    - Security Rules (CRITICAL)"
echo "    - Joe's Context (CRITICAL)"
echo "    - Critical Issues (CRITICAL)"
echo "    - System Reliability (CRITICAL)"
echo "    - Core Philosophy (CRITICAL)"
echo ""
echo "  Candidates for archival:"
grep -E "^##" "$MEMORY_FILE" | grep -v "^## (Security|Joe|Critical|System|Core)" || echo "    (none matching old date patterns)"
echo ""
echo "  Status: $BEFORE_SIZE bytes ($(( BEFORE_SIZE * 100 / 20000 ))% of limit)"
echo ""

if [[ $BEFORE_SIZE -lt 19500 ]]; then
  echo "[OK] MEMORY.md is within safe limits. No archival needed."
  exit 0
fi

if [[ "$MODE" == "apply" ]]; then
  echo "[APPLYING] Archival (not yet implemented - manual review recommended)"
  echo "Next: Identify which sections are >30 days old and safe to archive"
  exit 0
else
  echo "[DRY-RUN] To apply changes, run:"
  echo "  bash $0 apply"
  exit 0
fi
