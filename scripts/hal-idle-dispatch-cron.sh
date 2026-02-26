#!/bin/bash
# hal-idle-dispatch-cron.sh
# Called by cron every 30 min. Checks if HAL is idle and dispatches
# the next qualifying Kanban task to HAL via the gateway.
# Alfred (main) handles actual sessions_spawn via a gateway message.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE="${SCRIPT_DIR%/scripts}"
TRACK_DIR="$WORKSPACE/.hal-alfred-tracking"
LOG="$TRACK_DIR/hal-dispatch.log"
GW_CONFIG="$HOME/.openclaw/openclaw.json"

mkdir -p "$TRACK_DIR"

ts() { date '+%Y-%m-%dT%H:%M:%S%z'; }

log() { echo "[$(ts)] $*" | tee -a "$LOG"; }

# ── 1. Check HAL subagent status (no active = idle) ─────────────────────────
ACTIVE=$(curl -s "http://localhost:3001/api/kanban" 2>/dev/null | python3 -c "
import sys,json
b=json.load(sys.stdin)
in_prog=[c for c in b.get('cards',[]) if c.get('column')=='in_progress']
print(len(in_prog))
" 2>/dev/null || echo "0")

# Check HAL dispatch log: was something dispatched in the last 20 min?
LAST_DISPATCH=""
if [[ -f "$TRACK_DIR/dispatch.jsonl" ]]; then
  LAST_DISPATCH=$(tail -n 5 "$TRACK_DIR/dispatch.jsonl" | python3 -c "
import sys,json,datetime
now=datetime.datetime.utcnow()
for line in sys.stdin:
  try:
    d=json.loads(line)
    if d.get('route')=='HAL' and d.get('dispatch_result')=='dispatched_to_hal':
      ts=datetime.datetime.fromisoformat(d['timestamp'].replace('Z',''))
      age_min=(now-ts).total_seconds()/60
      if age_min < 20:
        print('busy')
        break
  except: pass
" 2>/dev/null || echo "")
fi

if [[ "$LAST_DISPATCH" == "busy" ]]; then
  log "HAL recently dispatched a task (within 20 min) — skipping"
  exit 0
fi

# ── 2. Find best HAL-qualified task ─────────────────────────────────────────
TASK_JSON=$("$SCRIPT_DIR/hal-get-idle-task.sh" 2>/dev/null || echo "")

if [[ -z "$TASK_JSON" ]]; then
  log "No HAL-qualifying tasks in To Do column — skipping"
  exit 0
fi

TASK_ID=$(echo "$TASK_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['task_id'])")
TITLE=$(echo "$TASK_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['title'])")
DESC=$(echo "$TASK_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin).get('description',''))")

log "HAL idle — dispatching: [$TASK_ID] $TITLE"

# ── 3. Notify Alfred to dispatch to HAL ──────────────────────────────────────
GW_TOKEN=$(python3 -c "import json; c=json.load(open('$GW_CONFIG')); print(c['gateway']['auth']['token'])" 2>/dev/null)
GW_PORT=$(python3 -c "import json; c=json.load(open('$GW_CONFIG')); print(c.get('gateway',{}).get('port',18789))" 2>/dev/null)

MSG="[HAL-DISPATCH-REQUEST] HAL is idle. Please dispatch this Kanban task to HAL now using sessions_spawn(agentId=hal, mode=run):

Card ID: $TASK_ID
Title: $TITLE
Description: $DESC

After dispatching, move the card to in_progress with: kanban-move.sh $TASK_ID in_progress"

node "$SCRIPT_DIR/gateway-send-to-alfred.js" "$MSG" "$GW_TOKEN" "$GW_PORT" 2>/dev/null && \
  log "Dispatch request sent to Alfred for: $TITLE" || \
  log "WARNING: Failed to send dispatch request to Alfred"
