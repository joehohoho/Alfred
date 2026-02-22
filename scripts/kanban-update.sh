#!/bin/bash
# kanban-update.sh — Update fields on a kanban card
#
# Usage:
#   kanban-update.sh <card_id> <field> <value>
#
# Fields: title, description, priority
#
# Examples:
#   kanban-update.sh goal_1771610220154_a9d87314 description "Implemented auth flow. Testing remaining."
#   kanban-update.sh task_1771610220154_b2c45678 priority urgent
#   kanban-update.sh goal_1771610220154_a9d87314 title "Updated Goal Title"

CARD_ID="${1:-}"
FIELD="${2:-}"
VALUE="${3:-}"

if [ -z "$CARD_ID" ] || [ -z "$FIELD" ] || [ -z "$VALUE" ]; then
  echo "Usage: kanban-update.sh <card_id> <field> <value>" >&2
  echo "Fields: title, description, priority" >&2
  exit 1
fi

VALID_FIELDS="title description priority"
if ! echo "$VALID_FIELDS" | grep -qw "$FIELD"; then
  echo "ERROR: Invalid field '$FIELD'. Must be one of: $VALID_FIELDS" >&2
  exit 1
fi

API="http://localhost:3001/api/kanban/${CARD_ID}"

JSON=$(python3 -c "
import json, sys
print(json.dumps({sys.argv[1]: sys.argv[2]}))
" "$FIELD" "$VALUE")

RESPONSE=$(curl -s -w "\n%{http_code}" -X PATCH "$API" \
  -H "Content-Type: application/json" \
  -d "$JSON")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  TITLE=$(echo "$BODY" | python3 -c "import json,sys; print(json.load(sys.stdin).get('title','unknown'))" 2>/dev/null)
  echo "OK: Updated '$TITLE' — $FIELD set"
  exit 0
else
  echo "ERROR: HTTP $HTTP_CODE — $BODY" >&2
  exit 1
fi
