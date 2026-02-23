#!/bin/bash
# kanban-stale-scan.sh — Scan for stale/undelivered kanban cards and re-notify Alfred
# Called by cron every 4 hours as a safety net for failed deliveries
# Usage: kanban-stale-scan.sh

API="http://localhost:3001/api/kanban/rescan"

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API" \
  -H "Content-Type: application/json")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" != "200" ]; then
  echo "ERROR: HTTP $HTTP_CODE — $BODY" >&2
  exit 1
fi

# Parse result
STALE_COUNT=$(echo "$BODY" | python3 -c "import json,sys; d=json.load(sys.stdin); print(len(d.get('staleCards',[])))" 2>/dev/null)
TOTAL=$(echo "$BODY" | python3 -c "import json,sys; print(json.load(sys.stdin).get('totalCards',0))" 2>/dev/null)
REDELIVERED=$(echo "$BODY" | python3 -c "import json,sys; print(json.load(sys.stdin).get('redelivered',0))" 2>/dev/null)
FAILED=$(echo "$BODY" | python3 -c "import json,sys; print(json.load(sys.stdin).get('failed',0))" 2>/dev/null)

if [ "$STALE_COUNT" = "0" ]; then
  echo "No stale cards found ($TOTAL cards scanned)"
  exit 0
fi

echo "Found $STALE_COUNT stale cards — $REDELIVERED redelivered, $FAILED failed ($TOTAL total scanned)"

# Print each stale card
echo "$BODY" | python3 -c "
import json, sys
d = json.load(sys.stdin)
for c in d.get('staleCards', []):
    status = '✓' if c['delivered'] else '✗'
    print(f\"  {status} {c['title']} ({c['id']}) — {c['reason']}\")
" 2>/dev/null

exit 0
