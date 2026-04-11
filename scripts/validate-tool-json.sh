#!/bin/bash
# validate-tool-json.sh
# Validates tool call JSON parameters in gateway logs and reports malformed calls
# Usage: ./validate-tool-json.sh [--log-path PATH] [--since MINUTES] [--fix]

set -e

LOG_PATH="${LOG_PATH:-~/.openclaw/logs/gateway.err.log}"
SINCE_MINUTES="${SINCE_MINUTES:-60}"
FIX_MODE=false

while [[ $# -gt 0 ]]; do
    case "$1" in
        --log-path) LOG_PATH="$2"; shift 2 ;;
        --since) SINCE_MINUTES="$2"; shift 2 ;;
        --fix) FIX_MODE=true; shift ;;
        *) shift ;;
    esac
done

LOG_PATH="${LOG_PATH/#\~/$HOME}"

if [[ ! -f "$LOG_PATH" ]]; then
    echo "❌ Log file not found: $LOG_PATH"
    exit 1
fi

echo "🔍 Scanning $LOG_PATH for JSON errors (last $SINCE_MINUTES minutes)..."

# Extract JSON errors from the last N minutes
ERRORS=$(grep -E "Expected.*in JSON at position" "$LOG_PATH" | tail -20)

if [[ -z "$ERRORS" ]]; then
    echo "✅ No JSON parsing errors found in recent logs."
    exit 0
fi

echo ""
echo "⚠️  Found JSON parsing errors:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

ERROR_COUNT=0
while IFS= read -r line; do
    ERROR_COUNT=$((ERROR_COUNT + 1))
    
    # Extract timestamp
    TIMESTAMP=$(echo "$line" | grep -oE "^[0-9T:\.\-]+")
    
    # Extract position info
    POSITION=$(echo "$line" | grep -oE "position [0-9]+" | grep -oE "[0-9]+")
    ERROR_MSG=$(echo "$line" | grep -oE "Expected '[^']+'" )
    
    echo "  [$ERROR_COUNT] Time: $TIMESTAMP"
    echo "      Error: $ERROR_MSG at position $POSITION"
    echo ""
done <<< "$ERRORS"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Total errors (last 20): $ERROR_COUNT"

if $FIX_MODE; then
    echo ""
    echo "🔧 FIX MODE: Would need to identify and fix tool call generation."
    echo "   Common causes:"
    echo "   1. Array parameters without proper comma separation"
    echo "   2. Object properties missing quotes around keys"
    echo "   3. Escaped quotes breaking JSON structure"
    echo "   4. Tool parameter nesting issues"
    echo ""
    echo "   Recommendation: Check embedded agent system prompt for tool JSON generation."
fi

# Return error code if issues found
[[ $ERROR_COUNT -gt 0 ]] && exit 1
