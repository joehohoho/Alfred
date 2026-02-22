#!/bin/bash
# kanban-blocker.sh — Add a blocker question to a kanban card (moves to Blocked column)
#
# Usage:
#   kanban-blocker.sh <card_id> <question>
#
# The card moves to the Blocked column and Joe sees your question in the UI.
# When Joe answers, you'll receive a [KANBAN-UNBLOCK] message with the answer.
#
# Examples:
#   kanban-blocker.sh goal_1771610220154_a9d87314 "Should I use PostgreSQL or SQLite for the database?"
#   kanban-blocker.sh task_1771610220154_b2c45678 "The API returns 403. Do I need a new API key?"

CARD_ID="${1:-}"
MESSAGE="${2:-}"

if [ -z "$CARD_ID" ] || [ -z "$MESSAGE" ]; then
  echo "Usage: kanban-blocker.sh <card_id> <question>" >&2
  exit 1
fi

API="http://localhost:3001/api/kanban/${CARD_ID}/blocker"

JSON=$(python3 -c "
import json, sys
print(json.dumps({'message': sys.argv[1]}))
" "$MESSAGE")

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API" \
  -H "Content-Type: application/json" \
  -d "$JSON")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  TITLE=$(echo "$BODY" | python3 -c "import json,sys; print(json.load(sys.stdin).get('title','unknown'))" 2>/dev/null)
  echo "OK: Blocked '$TITLE' — question sent to Joe"
  exit 0
else
  echo "ERROR: HTTP $HTTP_CODE — $BODY" >&2
  exit 1
fi
