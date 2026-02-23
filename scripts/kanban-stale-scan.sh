#!/bin/bash
# kanban-stale-scan.sh — Scan for stale/undelivered cards AND auto-move abandoned work
# Called by cron every 4 hours as a safety net
# Two functions:
#   1. Rescan failed deliveries (existing)
#   2. Auto-move in_progress cards stale >12h back to todo
# Usage: kanban-stale-scan.sh

STALE_WORK_HOURS=12  # Cards in_progress with no update for this long get moved to todo

# ── Part 1: Auto-move stale in_progress cards back to todo ──
echo "=== Stale Work Check (>${STALE_WORK_HOURS}h in_progress) ==="

BOARD=$(curl -s http://localhost:3001/api/kanban 2>/dev/null)
if [ -n "$BOARD" ]; then
  MOVED=$(echo "$BOARD" | python3 -c "
import json, sys, subprocess
from datetime import datetime, timezone

STALE_HOURS = $STALE_WORK_HOURS
now = datetime.now(timezone.utc)
board = json.load(sys.stdin)
in_progress = board.get('columns', {}).get('in_progress', [])
moved = 0

for card in in_progress:
    updated = card.get('updatedAt', '')
    if not updated:
        continue
    try:
        dt = datetime.fromisoformat(updated.replace('Z', '+00:00'))
        hours = (now - dt).total_seconds() / 3600
        if hours > STALE_HOURS:
            card_id = card['id']
            title = card['title']
            # Move back to todo via API
            result = subprocess.run(
                ['curl', '-s', '-X', 'POST',
                 f'http://localhost:3001/api/kanban/{card_id}/move',
                 '-H', 'Content-Type: application/json',
                 '-d', json.dumps({'toColumn': 'todo'})],
                capture_output=True, text=True, timeout=10
            )
            if result.returncode == 0 and 'todo' in result.stdout:
                print(f'  ↩ Moved to todo: {title} (stale {hours:.1f}h)')
                moved += 1
            else:
                print(f'  ✗ Failed to move: {title} — {result.stdout[:100]}')
    except Exception as e:
        print(f'  ✗ Error: {e}')

if moved == 0:
    print('  No stale work cards found')
print(f'MOVED={moved}')
" 2>/dev/null)
  echo "$MOVED"
fi

# ── Part 2: Rescan failed deliveries (original) ──
echo ""
echo "=== Delivery Rescan ==="

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
  echo "No stale deliveries found ($TOTAL cards scanned)"
  exit 0
fi

echo "Found $STALE_COUNT stale deliveries — $REDELIVERED redelivered, $FAILED failed ($TOTAL total scanned)"

echo "$BODY" | python3 -c "
import json, sys
d = json.load(sys.stdin)
for c in d.get('staleCards', []):
    status = '✓' if c['delivered'] else '✗'
    print(f\"  {status} {c['title']} ({c['id']}) — {c['reason']}\")
" 2>/dev/null

exit 0
