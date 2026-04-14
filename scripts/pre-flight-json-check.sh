#!/bin/bash
# pre-flight-json-check.sh
# Quick validation for common JSON array/object fields in agent calls
# Catches malformed JSON before it reaches the gateway
#
# Usage:
#   pre-flight-json-check.sh '{"toolsAllow":["tool1","tool2"],"fields":[...]}'
#
# Exit: 0 = all JSON valid, 1 = validation failed

set -euo pipefail

PAYLOAD="${1:-}"

if [[ -z "$PAYLOAD" ]]; then
  echo "Usage: $0 '<json_payload>'" >&2
  exit 1
fi

# Validate root as JSON
if ! echo "$PAYLOAD" | jq . >/dev/null 2>&1; then
  echo "ERROR: Payload is not valid JSON" >&2
  echo "  Input: $PAYLOAD" >&2
  exit 1
fi

# Extract and validate critical array fields
declare -a ARRAY_FIELDS=("toolsAllow" "fallbacks" "fields" "images" "attachments" "targets" "stickerId" "pollOption" "channelIds" "authorIds")

for FIELD in "${ARRAY_FIELDS[@]}"; do
  if echo "$PAYLOAD" | jq -e ".$FIELD" >/dev/null 2>&1; then
    FIELD_VALUE=$(echo "$PAYLOAD" | jq -r ".$FIELD")
    
    # If field exists and is not null/empty, validate it's a proper array
    if [[ "$FIELD_VALUE" != "null" && -n "$FIELD_VALUE" ]]; then
      if ! echo "$FIELD_VALUE" | jq . >/dev/null 2>&1; then
        echo "ERROR: Field '$FIELD' contains malformed JSON" >&2
        echo "  Value: $FIELD_VALUE" >&2
        exit 1
      fi
      
      # Ensure it's an array
      if ! echo "$FIELD_VALUE" | jq -e 'type == "array"' >/dev/null 2>&1; then
        echo "WARNING: Field '$FIELD' is not an array (type: $(echo "$FIELD_VALUE" | jq -r 'type'))" >&2
      fi
    fi
  fi
done

echo "✓ All JSON validation passed"
exit 0
