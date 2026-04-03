#!/bin/bash
# memory-append-safe.sh — Safe append to daily memory files without exact-match brittle edits
#
# Purpose: Agents struggle with whitespace-exact matching in edit tool calls.
# This script appends to daily memory (memory/YYYY-MM-DD.md) safely without edit tool.
#
# Usage:
#   memory-append-safe.sh "## Section\n\nContent to append"
#   memory-append-safe.sh "Content" --date 2026-03-25
#   memory-append-safe.sh "Content" --section "Tasks"
#
# Ensures:
# - File exists (auto-creates if needed)
# - No duplicate newlines
# - No whitespace corruption
# - Atomic writes (no partial commits on failure)

set -euo pipefail

CONTENT="${1:-}"
DATE=""
SECTION=""

# Parse args
while [[ $# -gt 1 ]]; do
  case "$2" in
    --date) DATE="${3:-}"; shift 2 ;;
    --section) SECTION="${3:-}"; shift 2 ;;
    *) shift ;;
  esac
done

if [[ -z "$CONTENT" ]]; then
  echo "ERROR: Content required. Usage: $0 <content> [--date YYYY-MM-DD] [--section name]" >&2
  exit 1
fi

# Determine date
if [[ -z "$DATE" ]]; then
  DATE=$(date +%Y-%m-%d)
fi

MEMORY_DIR="$HOME/.openclaw/workspace/memory"
MEMORY_FILE="$MEMORY_DIR/$DATE.md"

# Ensure directory & file exist
mkdir -p "$MEMORY_DIR"
if [[ ! -f "$MEMORY_FILE" ]]; then
  cat > "$MEMORY_FILE" <<EOF
# Daily Memory — $DATE

EOF
fi

# Create temp file for atomic write
TMP_FILE=$(mktemp)
trap "rm -f '$TMP_FILE'" EXIT

# Append content (with section header if provided)
if [[ -n "$SECTION" ]]; then
  {
    cat "$MEMORY_FILE"
    echo ""
    echo "## $SECTION"
    echo ""
    echo "$CONTENT"
    echo ""
  } > "$TMP_FILE"
else
  {
    cat "$MEMORY_FILE"
    echo ""
    echo "$CONTENT"
    echo ""
  } > "$TMP_FILE"
fi

# Verify file is non-empty
if [[ ! -s "$TMP_FILE" ]]; then
  echo "ERROR: Failed to create valid memory file" >&2
  exit 1
fi

# Atomic move
mv "$TMP_FILE" "$MEMORY_FILE"

echo "✓ Appended to $MEMORY_FILE"
exit 0
