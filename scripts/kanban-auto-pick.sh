#!/bin/bash
# kanban-auto-pick.sh — Auto-pick next todo card if Alfred is idle
# Called by cron every 2 hours to keep Alfred productive
# Usage: kanban-auto-pick.sh

API="http://localhost:3001/api/kanban/auto-pick"

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API" \
  -H "Content-Type: application/json")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" != "200" ]; then
  echo "ERROR: HTTP $HTTP_CODE — $BODY" >&2
  exit 1
fi

# Parse result
IDLE=$(echo "$BODY" | python3 -c "import json,sys; print(json.load(sys.stdin).get('idle', False))" 2>/dev/null)
REASON=$(echo "$BODY" | python3 -c "import json,sys; print(json.load(sys.stdin).get('reason',''))" 2>/dev/null)
PICKED=$(echo "$BODY" | python3 -c "import json,sys; p=json.load(sys.stdin).get('picked'); print(p['title'] if p else 'none')" 2>/dev/null)
TODO_COUNT=$(echo "$BODY" | python3 -c "import json,sys; print(json.load(sys.stdin).get('todoCount',0))" 2>/dev/null)
IN_PROGRESS=$(echo "$BODY" | python3 -c "import json,sys; print(json.load(sys.stdin).get('inProgressCount',0))" 2>/dev/null)

if [ "$IDLE" = "True" ] && [ "$PICKED" != "none" ]; then
  echo "Auto-picked: $PICKED ($TODO_COUNT todo remaining)"
elif [ "$IDLE" = "True" ]; then
  echo "Alfred idle — no todo cards to pick up"
else
  echo "Alfred busy ($IN_PROGRESS in-progress) — $REASON"
fi

exit 0
