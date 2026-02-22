#!/bin/bash
# kanban-move.sh — Move a kanban card to a column
#
# Usage:
#   kanban-move.sh <card_id> <to_column>
#
# Columns: ideas, goals, todo, in_progress, blocked, review, done
#
# Examples:
#   kanban-move.sh goal_1771610220154_a9d87314 in_progress
#   kanban-move.sh task_1771610220154_b2c45678 review
#   kanban-move.sh goal_1771610220154_a9d87314 done

CARD_ID="${1:-}"
TO_COLUMN="${2:-}"

if [ -z "$CARD_ID" ] || [ -z "$TO_COLUMN" ]; then
  echo "Usage: kanban-move.sh <card_id> <to_column>" >&2
  echo "Columns: ideas, goals, todo, in_progress, blocked, review, done" >&2
  exit 1
fi

VALID_COLUMNS="ideas goals todo in_progress blocked review done"
if ! echo "$VALID_COLUMNS" | grep -qw "$TO_COLUMN"; then
  echo "ERROR: Invalid column '$TO_COLUMN'. Must be one of: $VALID_COLUMNS" >&2
  exit 1
fi

API="http://localhost:3001/api/kanban/${CARD_ID}/move"

JSON=$(python3 -c "
import json, sys
print(json.dumps({'toColumn': sys.argv[1]}))
" "$TO_COLUMN")

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API" \
  -H "Content-Type: application/json" \
  -d "$JSON")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  TITLE=$(echo "$BODY" | python3 -c "import json,sys; print(json.load(sys.stdin).get('title','unknown'))" 2>/dev/null)
  echo "OK: Moved '$TITLE' → $TO_COLUMN"
  exit 0
else
  echo "ERROR: HTTP $HTTP_CODE — $BODY" >&2
  exit 1
fi
