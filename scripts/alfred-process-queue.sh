#!/bin/bash
# alfred-process-queue.sh
# Processes Alfred's task queue (created by alfred-work-executor)
# Called during Alfred's session boot (not as standalone cron)
# Usage: bash alfred-process-queue.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE="${SCRIPT_DIR%/scripts}"
TRACK_DIR="$WORKSPACE/.hal-alfred-tracking"
QUEUE_FILE="$TRACK_DIR/alfred-queue.jsonl"

if [[ ! -f "$QUEUE_FILE" ]]; then
  exit 0  # No queue, nothing to do
fi

PENDING=$(grep '"status":"pending"' "$QUEUE_FILE" 2>/dev/null || echo "")
if [[ -z "$PENDING" ]]; then
  exit 0  # No pending items
fi

# Process first pending item
FIRST_ITEM=$(echo "$PENDING" | head -1)
CARD_ID=$(echo "$FIRST_ITEM" | python3 -c "import sys,json; print(json.load(sys.stdin).get('card_id',''))" 2>/dev/null)
TITLE=$(echo "$FIRST_ITEM" | python3 -c "import sys,json; print(json.load(sys.stdin).get('title',''))" 2>/dev/null)
DESC=$(echo "$FIRST_ITEM" | python3 -c "import sys,json; print(json.load(sys.stdin).get('description',''))" 2>/dev/null)
PRIORITY=$(echo "$FIRST_ITEM" | python3 -c "import sys,json; print(json.load(sys.stdin).get('priority','normal'))" 2>/dev/null)

if [[ -n "$CARD_ID" && -n "$TITLE" ]]; then
  # Update queue status
  python3 - "$CARD_ID" <<'PY' "$QUEUE_FILE"
import sys, json
card_id = sys.argv[1]
queue_file = sys.argv[2]
try:
  with open(queue_file, 'r') as f:
    lines = f.readlines()
  with open(queue_file, 'w') as f:
    for line in lines:
      d = json.loads(line)
      if d.get('card_id') == card_id:
        d['status'] = 'in_progress'
      f.write(json.dumps(d, separators=(',', ':')) + '\n')
except:
  pass
PY
  
  # Write to ACTIVE-TASK for Alfred to see
  cat > "$WORKSPACE/ACTIVE-TASK.md" <<EOF
# ACTIVE-TASK.md — Current Work State

**Status:** \`in_progress\` — Queued Kanban task  
**Last Updated:** $(date -u '+%Y-%m-%d %H:%M:%S UTC')

---

## Primary Task: $TITLE

**Kanban Card:** [$CARD_ID]($CARD_ID)  
**Priority:** $PRIORITY

### Objective
$DESC

### Instructions
1. Complete this task
2. When finished, post results to the Kanban card:
\`\`\`bash
curl -s -X POST http://localhost:3001/api/kanban/$CARD_ID/comments \\
  -H 'Content-Type: application/json' \\
  -d '{"author":"alfred","text":"Task complete. Results: [your summary]"}'
\`\`\`

3. If you need Joe's input, post a comment explaining what's blocking and move card to blocked.

The completion handler will auto-move the card based on whether it needs review.

### Next Step
Start work on this task.

---

**Queued by:** alfred-work-executor  
**Queue file:** ~/.hal-alfred-tracking/alfred-queue.jsonl
EOF
fi
