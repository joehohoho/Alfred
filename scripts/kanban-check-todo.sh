#!/bin/bash
# kanban-check-todo.sh — List available todo items for Alfred to pick up
# Usage: kanban-check-todo.sh

API="http://localhost:3001/api/kanban/todo"

RESPONSE=$(curl -s -w "\n%{http_code}" "$API")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" != "200" ]; then
  echo "ERROR: HTTP $HTTP_CODE — $BODY" >&2
  exit 1
fi

COUNT=$(echo "$BODY" | python3 -c "import json,sys; print(json.load(sys.stdin).get('count',0))" 2>/dev/null)

if [ "$COUNT" = "0" ]; then
  echo "No todo items available"
  exit 0
fi

echo "$COUNT todo item(s) available:"
echo "$BODY" | python3 -c "
import json, sys
d = json.load(sys.stdin)
for i, c in enumerate(d.get('cards', []), 1):
    pri = '🔴 URGENT' if c['priority'] == 'urgent' else '🔵 normal'
    print(f\"  {i}. [{c['type']}] {c['title']} ({c['id']}) — {pri}\")
" 2>/dev/null

exit 0
