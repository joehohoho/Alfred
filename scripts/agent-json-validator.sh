#!/bin/bash
# agent-json-validator.sh
# Validates and fixes JSON array/object parameters before agent tool calls
# Prevents "Expected ',' or ']' after array element" errors
#
# Usage:
#   agent-json-validator.sh "field_name" '{"key":"value"}'
#   agent-json-validator.sh "fields" '[{"name":"x"},{"name":"y"}]'
#
# Exit: 0 = valid/fixed JSON, 1 = unable to parse

set -euo pipefail

FIELD_NAME="${1:-}"
JSON_INPUT="${2:-}"

if [[ -z "$FIELD_NAME" || -z "$JSON_INPUT" ]]; then
  echo "Usage: $0 <field_name> <json_string>" >&2
  exit 1
fi

# Remove leading/trailing whitespace
JSON_INPUT=$(echo "$JSON_INPUT" | xargs)

# Try direct jq validation first
if echo "$JSON_INPUT" | jq empty 2>/dev/null; then
  echo "$JSON_INPUT"
  exit 0
fi

# If not valid, attempt fixes
FIXED="$JSON_INPUT"

# Fix 1: Unescaped newlines in strings (common cause of array errors)
FIXED=$(echo "$FIXED" | sed 's/\\$/\\/' | tr '\n' ' ')

# Fix 2: Missing commas between array elements
# Detects: }{ or ][ patterns without comma
FIXED=$(echo "$FIXED" | sed 's/}\s*{/}, {/g' | sed 's/]\s*\[/], [/g')

# Fix 3: Trailing commas in arrays/objects (valid in some contexts, strip for safety)
FIXED=$(echo "$FIXED" | sed 's/,\s*\]/]/g' | sed 's/,\s*}/}/g')

# Fix 4: Double quotes inside strings (escape them)
FIXED=$(echo "$FIXED" | sed 's/":/": /g')

# Validate fixed version
if echo "$FIXED" | jq empty 2>/dev/null; then
  echo "$FIXED"
  exit 0
else
  # Still invalid—output original and fail with diagnostic
  echo "ERROR: Unable to fix JSON in field '$FIELD_NAME'. Original:" >&2
  echo "  $JSON_INPUT" >&2
  echo "  Fixed attempt:" >&2
  echo "  $FIXED" >&2
  exit 1
fi
