#!/bin/bash
# tool-call-monitor.sh
# Monitors and validates tool call JSON before they are sent to the LLM
# Prevents "Expected ',' or ']' after array element" errors
#
# Usage:
#   bash tool-call-monitor.sh validate '{"tool":"message","action":"send",...}'
#   bash tool-call-monitor.sh scan-logs [--last-n 200]
#   bash tool-call-monitor.sh patterns

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="${LOG_DIR:-.}"
MONITOR_LOG="${MONITOR_LOG:-$LOG_DIR/tool-call-monitor.log}"

# ─────────────────────────────────────────────────────────────────
# Validate JSON syntax using Python
# ─────────────────────────────────────────────────────────────────
validate_json() {
  local json="$1"
  python3 << PYTHON_EOF
import json
try:
    json.loads('''$json''')
    exit(0)
except json.JSONDecodeError as e:
    print(f"INVALID_JSON: {e}", file=__import__('sys').stderr)
    exit(1)
PYTHON_EOF
}

# ─────────────────────────────────────────────────────────────────
# Check for common malformed patterns
# ─────────────────────────────────────────────────────────────────
check_common_patterns() {
  local json="$1"
  
  # Pattern 1: Missing comma between array elements ("item1" "item2")
  if [[ $json =~ \"[^\"]*\"\ +\" ]]; then
    echo "PATTERN_ERROR: Missing comma between array elements"
    return 1
  fi
  
  # Pattern 2: Missing colon after property name ({key"value})
  if [[ $json =~ \"[a-zA-Z_][a-zA-Z0-9_]*\"\" ]]; then
    echo "PATTERN_ERROR: Missing colon after property name"
    return 1
  fi
  
  # Pattern 3: Missing comma after property value (value"property})
  if [[ $json =~ [0-9a-z\}]\"[a-zA-Z_] ]]; then
    echo "PATTERN_ERROR: Possible missing comma after property value"
    return 1
  fi
  
  return 0
}

# ─────────────────────────────────────────────────────────────────
# Scan gateway logs for JSON errors
# ─────────────────────────────────────────────────────────────────
scan_logs() {
  local last_n="${1:-200}"
  local gateway_err="${HOME}/.openclaw/logs/gateway.err.log"
  
  if [[ ! -f "$gateway_err" ]]; then
    echo "Gateway log not found: $gateway_err"
    return 1
  fi
  
  echo "Scanning $gateway_err (last $last_n lines) for JSON errors..."
  echo ""
  
  tail -n "$last_n" "$gateway_err" | \
    grep -E "Expected.*in JSON" | \
    while read -r line; do
      timestamp=$(echo "$line" | cut -d' ' -f1)
      error_msg=$(echo "$line" | grep -oE "Expected[^(]*\([^)]*\)")
      echo "[$timestamp] $error_msg"
    done
  
  echo ""
  echo "Summary:"
  tail -n "$last_n" "$gateway_err" | \
    grep -oE "Expected[^(]*\([^)]*\)" | \
    sort | uniq -c | sort -rn
}

# ─────────────────────────────────────────────────────────────────
# Show known malformed patterns to avoid
# ─────────────────────────────────────────────────────────────────
show_patterns() {
  cat << 'PATTERNS'
Known JSON Malformation Patterns to Avoid:
──────────────────────────────────────────

❌ Missing comma between array elements:
   "targets": ["#channel1" "channel2"]
   ✅ Correct:
   "targets": ["#channel1", "channel2"]

❌ Missing colon after property name:
   {"tool""message""action":"send"}
   ✅ Correct:
   {"tool":"message","action":"send"}

❌ Missing comma after property value:
   {"message":"Hello""action":"send"}
   ✅ Correct:
   {"message":"Hello","action":"send"}

❌ Unescaped quotes in string values:
   {"message":"She said "hello""}
   ✅ Correct:
   {"message":"She said \"hello\""}

Debugging tip:
  python3 -c "import json; json.loads('<your_json>')"
  to find the exact position of the error.
PATTERNS
}

# ─────────────────────────────────────────────────────────────────
# Main command router
# ─────────────────────────────────────────────────────────────────

case "$1" in
  validate)
    if [[ -z "$2" ]]; then
      echo "Usage: $0 validate '<json>'"
      exit 1
    fi
    
    if check_common_patterns "$2"; then
      if validate_json "$2"; then
        echo "✅ JSON is valid"
        exit 0
      else
        exit 1
      fi
    else
      echo "⚠️  JSON has pattern issues"
      exit 1
    fi
    ;;
  
  scan-logs)
    last_n="${2:-200}"
    [[ "$last_n" == "--last-n" ]] && last_n="${3:-200}"
    scan_logs "$last_n"
    ;;
  
  patterns)
    show_patterns
    ;;
  
  *)
    cat << USAGE
tool-call-monitor.sh - Detect and prevent JSON parsing errors

Usage:
  $0 validate '<json>'           Validate tool call JSON
  $0 scan-logs [--last-n N]     Scan gateway.err.log for JSON errors
  $0 patterns                    Show common malformed patterns

Examples:
  $0 validate '{"tool":"message","action":"send"}'
  $0 scan-logs --last-n 500
USAGE
    exit 1
    ;;
esac
