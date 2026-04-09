#!/bin/bash
# tool-json-helper.sh
# Helper for building and validating tool parameter JSON
# Use this when constructing complex tool calls to avoid malformed JSON errors
#
# Usage:
#   # Simple builder
#   bash tool-json-helper.sh build "message" "send" --to "#channel" --message "Hello"
#
#   # Validate existing JSON
#   bash tool-json-helper.sh validate '{"tool":"test"}'
#
#   # Escape string for JSON
#   bash tool-json-helper.sh escape "String with \"quotes\" and \n newlines"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VALIDATOR="$SCRIPT_DIR/validate-tool-json.sh"

if [[ ! -f "$VALIDATOR" ]]; then
  echo "ERROR: validate-tool-json.sh not found at $VALIDATOR"
  exit 1
fi

# ─────────────────────────────────────────────────────────────────
# JSON escape helper
# ─────────────────────────────────────────────────────────────────
json_escape() {
  python3 -c "import sys, json; print(json.dumps(sys.stdin.read()))" < <(echo -n "$1")
}

# ─────────────────────────────────────────────────────────────────
# Build simple tool JSON from args
# ─────────────────────────────────────────────────────────────────
build_tool_json() {
  local tool="$1"
  local action="$2"
  shift 2
  
  # Start JSON object
  local json='{'
  json+=$(printf '"tool":"%s","action":"%s"' "$tool" "$action")
  
  # Add remaining key-value pairs (--key value)
  while [[ $# -gt 0 ]]; do
    if [[ "$1" == --* ]]; then
      local key="${1#--}"
      local value="$2"
      
      # Escape value if it contains special chars
      if [[ "$value" == "null" ]]; then
        json+=",\"$key\":null"
      elif [[ "$value" =~ ^[0-9]+$ ]]; then
        json+=",\"$key\":$value"
      elif [[ "$value" == "true" || "$value" == "false" ]]; then
        json+=",\"$key\":$value"
      else
        local escaped=$(json_escape "$value")
        json+=",\"$key\":$escaped"
      fi
      
      shift 2
    else
      echo "ERROR: Expected --key, got: $1" >&2
      exit 1
    fi
  done
  
  json+='}'
  
  echo "$json"
}

# ─────────────────────────────────────────────────────────────────
# Main command router
# ─────────────────────────────────────────────────────────────────

case "$1" in
  build)
    shift
    build_tool_json "$@"
    ;;
  validate)
    shift
    bash "$VALIDATOR" "$@"
    ;;
  escape)
    shift
    json_escape "$1"
    ;;
  *)
    echo "Usage: $0 {build|validate|escape} [args...]"
    echo ""
    echo "Commands:"
    echo "  build <tool> <action> --key value --key2 value2  Build tool JSON"
    echo "  validate '<json>'                                 Validate JSON string"
    echo "  escape '<string>'                                 Escape string for JSON"
    exit 1
    ;;
esac
