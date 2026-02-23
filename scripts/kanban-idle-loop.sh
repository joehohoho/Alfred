#!/bin/bash
# kanban-idle-loop.sh — Run idle loop: auto-pick + idle activities when Alfred has no work
# Called by cron every 30 minutes to keep Alfred productive
# Usage: kanban-idle-loop.sh

# Sync pending questions to ACTIVE-TASK.md (survives session death)
bash "$(dirname "$0")/sync-pending-questions.sh" 2>/dev/null || true

API="http://localhost:3001/api/kanban/idle-loop"

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API" \
  -H "Content-Type: application/json")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" != "200" ]; then
  echo "ERROR: HTTP $HTTP_CODE — $BODY" >&2
  exit 1
fi

# Parse result
BOARD_STATE=$(echo "$BODY" | python3 -c "import json,sys; print(json.load(sys.stdin).get('boardState', 'unknown'))" 2>/dev/null)
ACTION=$(echo "$BODY" | python3 -c "import json,sys; print(json.load(sys.stdin).get('action', 'none'))" 2>/dev/null)
REASON=$(echo "$BODY" | python3 -c "import json,sys; print(json.load(sys.stdin).get('reason', ''))" 2>/dev/null)
ACTIVITY_TYPE=$(echo "$BODY" | python3 -c "import json,sys; print(json.load(sys.stdin).get('activityType', ''))" 2>/dev/null)
DAILY=$(echo "$BODY" | python3 -c "import json,sys; d=json.load(sys.stdin).get('dailyDispatches',''); print(f' ({d}/15 today)' if d else '')" 2>/dev/null)

case "$ACTION" in
  "none")
    echo "[$BOARD_STATE] $REASON"
    ;;
  "auto-picked")
    CARD=$(echo "$BODY" | python3 -c "import json,sys; p=json.load(sys.stdin).get('pickedCard',{}); print(p.get('title','?'))" 2>/dev/null)
    echo "[$BOARD_STATE] Auto-picked: $CARD"
    ;;
  "idle-activity")
    DISPATCHED=$(echo "$BODY" | python3 -c "import json,sys; print(json.load(sys.stdin).get('dispatched', False))" 2>/dev/null)
    echo "[$BOARD_STATE] Idle activity: $ACTIVITY_TYPE (dispatched=$DISPATCHED)$DAILY"
    ;;
esac

exit 0
