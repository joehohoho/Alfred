#!/bin/bash
# validate-tool-json.sh
# Validates tool parameter JSON before gateway execution
# Catches malformed JSON early, prevents gateway agent run failures
#
# Usage:
#   validate-tool-json.sh '{"tool":"message","action":"send","to":"#channel","message":"test"}'
#   validate-tool-json.sh < tool-params.json
#
# Exit codes:
#   0 = Valid JSON
#   1 = Invalid JSON (prints error line + column)
#   2 = Empty input

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Read input from argument or stdin
if [[ $# -gt 0 ]]; then
  JSON_INPUT="$1"
else
  JSON_INPUT="$(cat)"
fi

# Check for empty input
if [[ -z "$JSON_INPUT" ]]; then
  echo -e "${RED}ERROR${NC}: Empty JSON input"
  exit 2
fi

# Validate JSON using jq (must be installed)
if ! command -v jq &> /dev/null; then
  echo -e "${YELLOW}WARNING${NC}: jq not found. Install with: brew install jq"
  exit 2
fi

# Run validation
if echo "$JSON_INPUT" | jq empty 2>&1 > /dev/null; then
  echo -e "${GREEN}✓ Valid JSON${NC}"
  exit 0
else
  # Extract error details
  ERROR_MSG=$(echo "$JSON_INPUT" | jq empty 2>&1 || true)
  echo -e "${RED}✗ Invalid JSON${NC}"
  echo -e "Error: $ERROR_MSG"
  
  # Pretty-print the problematic JSON for context
  echo -e "\n${YELLOW}Input (first 500 chars):${NC}"
  echo "$JSON_INPUT" | head -c 500
  echo -e "\n"
  
  exit 1
fi
