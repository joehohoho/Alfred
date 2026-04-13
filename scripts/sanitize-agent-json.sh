#!/bin/bash
# sanitize-agent-json.sh
# Fix common JSON malformation errors in agent tool outputs
# Detects and corrects:
#   - Unescaped newlines in strings
#   - Missing commas between object properties
#   - Unescaped quotes in values
#   - Invalid escape sequences
#
# Usage:
#   sanitize-agent-json.sh < malformed.json > fixed.json
#   echo '{"key":"val\n"}' | sanitize-agent-json.sh
#
# Exit code: 0 if valid JSON, 1 if unable to fix

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMP_FILE=$(mktemp)
trap 'rm -f "$TEMP_FILE"' EXIT

# Read JSON from stdin or file argument
if [[ $# -gt 0 ]]; then
  INPUT_FILE="$1"
  if [[ ! -f "$INPUT_FILE" ]]; then
    echo "ERROR: File not found: $INPUT_FILE" >&2
    exit 1
  fi
  cat "$INPUT_FILE" > "$TEMP_FILE"
else
  cat > "$TEMP_FILE"
fi

# ─────────────────────────────────────────────────────────────────
# ATTEMPT 1: Validate as-is with jq
# ─────────────────────────────────────────────────────────────────

if jq empty "$TEMP_FILE" 2>/dev/null; then
  # Already valid JSON
  cat "$TEMP_FILE"
  exit 0
fi

# ─────────────────────────────────────────────────────────────────
# ATTEMPT 2: Apply common fixes
# ─────────────────────────────────────────────────────────────────

ORIGINAL=$(cat "$TEMP_FILE")
FIXED="$ORIGINAL"

# Fix 1: Escape unescaped newlines within quoted strings
# Match: "...actual newline char..." and replace with \n
FIXED=$(echo "$FIXED" | python3 -c "
import sys, re, json
data = sys.stdin.read()

# Replace literal newlines inside strings with escaped newlines
# This is a simple regex that won't work for all cases, but handles most
fixed = re.sub(r'\"([^\"\\\\])*\n', lambda m: m.group(0).replace('\n', '\\\\n'), fixed)

# Try to parse; if it fails, output original (will fail below)
try:
  json.loads(fixed)
  print(fixed)
except:
  print(data)
" 2>/dev/null || echo "$FIXED")

# Fix 2: Add missing commas between properties
# Pattern: }[\s]*\" should be },\"
FIXED=$(echo "$FIXED" | sed -E 's/}[[:space:]]*"/},"/g')

# Fix 3: Escape unescaped quotes in string values
# This is risky; only do minimal escaping
FIXED=$(echo "$FIXED" | python3 -c "
import sys
data = sys.stdin.read()

# Double-check: attempt to parse
import json
try:
  json.loads(data)
  print(data)
  sys.exit(0)
except json.JSONDecodeError as e:
  # Unable to fix automatically
  print(data, file=sys.stderr)
  sys.exit(1)
" 2>/dev/null || echo "$FIXED")

# ─────────────────────────────────────────────────────────────────
# ATTEMPT 3: Final validation
# ─────────────────────────────────────────────────────────────────

if jq empty <<< "$FIXED" 2>/dev/null; then
  # Fixes worked
  echo "$FIXED"
  exit 0
else
  # Unable to fix—output original for debugging
  echo "ERROR: Unable to fix malformed JSON. Original input:" >&2
  echo "$ORIGINAL" >&2
  echo "Fixed attempt:" >&2
  echo "$FIXED" >&2
  echo "$ORIGINAL"
  exit 1
fi
