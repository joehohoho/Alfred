#!/bin/bash
# kanban-create.sh — Create a kanban card via the Command Center API
#
# Usage:
#   kanban-create.sh <type> <title> [description] [priority]
#
# Types: task, goal, idea
# Priority: urgent, normal (default: urgent)
#
# Examples:
#   kanban-create.sh task "Fix login bug" "Login throws 500 on Safari" urgent
#   kanban-create.sh task "Update docs"

TYPE="${1:-}"
TITLE="${2:-}"
DESCRIPTION="${3:-}"
PRIORITY="${4:-urgent}"

if [ -z "$TYPE" ] || [ -z "$TITLE" ]; then
  echo "Usage: kanban-create.sh <type> <title> [description] [priority]" >&2
  echo "Types: task, goal, idea" >&2
  echo "Priority: urgent, normal (default: urgent)" >&2
  exit 1
fi

API="http://localhost:3001/api/kanban"

JSON=$(python3 -c "
import json, sys
print(json.dumps({
    'type': sys.argv[1],
    'title': sys.argv[2],
    'description': sys.argv[3],
    'priority': sys.argv[4]
}))
" "$TYPE" "$TITLE" "$DESCRIPTION" "$PRIORITY")

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API" \
  -H "Content-Type: application/json" \
  -d "$JSON")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
  CARD_ID=$(echo "$BODY" | python3 -c "import json,sys; print(json.load(sys.stdin).get('id','unknown'))" 2>/dev/null)
  echo "OK: Created $TYPE '$TITLE' ($CARD_ID) with priority $PRIORITY"
  echo "$CARD_ID"
  exit 0
else
  echo "ERROR: HTTP $HTTP_CODE -- $BODY" >&2
  exit 1
fi
