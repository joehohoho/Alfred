#!/bin/bash
# hal-get-idle-task.sh
# Finds the best task from Kanban To Do column that qualifies for HAL routing.
# Outputs JSON: { task_id, title, description, priority, confidence } or empty string.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROUTER="$SCRIPT_DIR/hal-alfred-route-auto.sh"
API="http://localhost:3001/api/kanban"

# Guard: bail if any card is already in_progress (board enforces 1-at-a-time rule)
BOARD_JSON=$(curl -s "$API")
IN_PROG=$(echo "$BOARD_JSON" | python3 -c "
import sys,json
b=json.load(sys.stdin)
print(len(b.get('columns',{}).get('in_progress',[])))
" 2>/dev/null || echo "0")
if [[ "$IN_PROG" -gt 0 ]]; then
  echo "" ; exit 0
fi

# Get To Do cards using correct board structure
TODO_JSON=$(echo "$BOARD_JSON" | python3 -c "
import sys, json
board = json.load(sys.stdin)
cards = board.get('columns', {}).get('todo', [])
print(json.dumps(cards))
" 2>/dev/null)

if [[ -z "$TODO_JSON" || "$TODO_JSON" == "[]" ]]; then
  echo "" ; exit 0
fi

# Score each card; pick first that routes to HAL
while IFS= read -r card; do
  CARD_ID=$(echo "$card" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
  TITLE=$(echo "$card" | python3 -c "import sys,json; print(json.load(sys.stdin).get('title',''))" 2>/dev/null)
  DESC=$(echo "$card" | python3 -c "import sys,json; print(json.load(sys.stdin).get('description',''))" 2>/dev/null)
  PRIORITY=$(echo "$card" | python3 -c "import sys,json; print(json.load(sys.stdin).get('priority','normal'))" 2>/dev/null)

  [[ -z "$CARD_ID" || -z "$TITLE" ]] && continue

  TASK_TEXT="$TITLE. $DESC"
  ROUTE_JSON=$("$ROUTER" --text "$TASK_TEXT" --json 2>/dev/null || echo '{"route":"Alfred"}')
  ROUTE=$(echo "$ROUTE_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin).get('route','Alfred'))" 2>/dev/null)
  CONFIDENCE=$(echo "$ROUTE_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin).get('confidence',0))" 2>/dev/null)

  if [[ "$ROUTE" == "HAL" ]]; then
    python3 -c "
import json,sys
title=sys.argv[1]; desc=sys.argv[2]; cid=sys.argv[3]; pri=sys.argv[4]; conf=sys.argv[5]
print(json.dumps({'task_id':cid,'title':title,'description':desc,'priority':pri,'confidence':float(conf)}))
" "$TITLE" "$DESC" "$CARD_ID" "$PRIORITY" "$CONFIDENCE"
    exit 0
  fi
done < <(echo "$TODO_JSON" | python3 -c "
import sys,json
for c in json.load(sys.stdin):
    print(json.dumps(c))
")

echo ""
