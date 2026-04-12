#!/bin/bash
# hal-task-completion-listener.sh
# Monitors for HAL task completion and immediately triggers next proactive task dispatch
# Runs continuously or via cron (every 5 min) to catch completions quickly
# Usage: bash hal-task-completion-listener.sh
# Output: [ACTION:NEXT_DISPATCHED] if HAL completion detected and next task started

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE="${SCRIPT_DIR%/scripts}"
TRACK_DIR="$WORKSPACE/.hal-alfred-tracking"
DISPATCH_LOG="$TRACK_DIR/dispatch.jsonl"
HAL_LOG="$TRACK_DIR/hal-dispatch.log"

mkdir -p "$TRACK_DIR"
ts() { date '+%Y-%m-%dT%H:%M:%S%z'; }
log() { echo "[$(ts)] $*" >> "$HAL_LOG"; }

# ── Check if HAL just completed a task (in last 5 min) ─────────────────────
LAST_HAL_DISPATCH_TIME=0
if [[ -f "$DISPATCH_LOG" ]]; then
  LAST_HAL_DISPATCH_TIME=$(tail -n 1 "$DISPATCH_LOG" 2>/dev/null \
    | python3 -c "
import sys, json, datetime
try:
    d = json.loads(sys.stdin.read())
    ts_str = d.get('timestamp', '')
    if ts_str.endswith('Z'): ts_str = ts_str[:-1] + '+00:00'
    t = datetime.datetime.fromisoformat(ts_str)
    print(int(t.timestamp() * 1000))
except:
    print(0)
" 2>/dev/null || echo "0")
fi

# Time since last dispatch (in seconds)
NOW_MS=$(date +%s%3N)
ELAPSED_SEC=$(( (NOW_MS - LAST_HAL_DISPATCH_TIME) / 1000 ))

# If last dispatch was >25 min ago (25 min = time for 15-min dispatch + 10-min execution buffer)
# assume HAL completed previous task and is ready for next
if [[ "$ELAPSED_SEC" -gt 1500 ]]; then
  log "COMPLETION_DETECTED: HAL idle for ${ELAPSED_SEC}s, ready for next task"
  
  # Dispatch next proactive task immediately
  DISPATCH_OUT=$(timeout 45 node "$SCRIPT_DIR/hal-dispatch-ws.js" \
    "[AUTO-NEXT-TASK] Previous task completed. Pick next from proactive pool." 2>&1) && {
    log "AUTO_DISPATCH_SUCCESS: $DISPATCH_OUT"
    echo "[ACTION:NEXT_DISPATCHED] auto_dispatch_completed"
  } || {
    log "AUTO_DISPATCH_FAILED: exit=$? output=$DISPATCH_OUT"
    echo "[ACTION:SKIP] reason=auto_dispatch_failed"
  }
  exit 0
fi

# Otherwise, HAL is still working or cooldown active
echo "[ACTION:SKIP] reason=hal_still_working elapsed_sec=${ELAPSED_SEC}"
