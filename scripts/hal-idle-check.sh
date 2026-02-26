#!/bin/bash
# hal-idle-check.sh
# Lightweight HAL idle status check — file reads only, zero model cost.
# Outputs JSON: { idle: bool, idle_minutes: int, suggested_action: str, next_task: str }

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE="${SCRIPT_DIR%/scripts}"
TRACK_DIR="$WORKSPACE/.hal-alfred-tracking"
POOL_FILE="$WORKSPACE/HAL-PROACTIVE-TASKS.md"
POOL_INDEX_FILE="$TRACK_DIR/proactive-pool-index.txt"
DISPATCH_LOG="$TRACK_DIR/dispatch.jsonl"

mkdir -p "$TRACK_DIR"

IDLE_THRESHOLD_MIN="${1:-25}"  # consider idle after N minutes (default 25)
NOW_EPOCH=$(date +%s)

# ── 1. Find last HAL dispatch time ───────────────────────────────────────────
LAST_DISPATCH_EPOCH=0
if [[ -f "$DISPATCH_LOG" ]]; then
  LAST_DISPATCH_EPOCH=$(tail -n 20 "$DISPATCH_LOG" | python3 -c "
import sys,json,datetime
latest=0
for line in sys.stdin:
  try:
    d=json.loads(line)
    ts=d.get('timestamp','')
    if ts:
      if ts.endswith('Z'): ts=ts[:-1]+'+00:00'
      t=int(datetime.datetime.fromisoformat(ts).timestamp())
      if t>latest: latest=t
  except: pass
print(latest)
" 2>/dev/null || echo "0")
fi

IDLE_SECONDS=$((NOW_EPOCH - LAST_DISPATCH_EPOCH))
IDLE_MINUTES=$((IDLE_SECONDS / 60))
IS_IDLE=false
[[ $IDLE_MINUTES -ge $IDLE_THRESHOLD_MIN ]] && IS_IDLE=true

# ── 2. Determine action + next task ──────────────────────────────────────────
SUGGESTED_ACTION="none"
NEXT_TASK=""

if [[ "$IS_IDLE" == "true" ]]; then
  # Check Kanban To Do for HAL-qualifying tasks first
  HAL_TASK_JSON=$("$SCRIPT_DIR/hal-get-idle-task.sh" 2>/dev/null || echo "")
  if [[ -n "$HAL_TASK_JSON" ]]; then
    SUGGESTED_ACTION="dispatch_kanban"
    NEXT_TASK=$(echo "$HAL_TASK_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('title',''))" 2>/dev/null)
  else
    # Check if a card is already in_progress before falling back to proactive pool.
    # (hal-get-idle-task.sh may have returned empty due to the in_progress guard.)
    BOARD_JSON=$(curl -s "http://localhost:3001/api/kanban" 2>/dev/null || echo "{}")
    IN_PROG_COUNT=$(echo "$BOARD_JSON" | python3 -c "
import sys,json
b=json.load(sys.stdin)
print(len(b.get('columns',{}).get('in_progress',[])))
" 2>/dev/null || echo "0")

    if [[ "$IN_PROG_COUNT" -gt 0 ]]; then
      IN_PROG_TITLE=$(echo "$BOARD_JSON" | python3 -c "
import sys,json
cards=json.load(sys.stdin).get('columns',{}).get('in_progress',[])
print(cards[0].get('title','unknown') if cards else 'unknown')
" 2>/dev/null || echo "unknown")
      SUGGESTED_ACTION="blocked_by_in_progress"
      NEXT_TASK="$IN_PROG_TITLE"
    else
    # Fall back to proactive pool
    SUGGESTED_ACTION="dispatch_proactive"
    # Get + advance pool index
    POOL_INDEX=0
    if [[ -f "$POOL_INDEX_FILE" ]]; then
      POOL_INDEX=$(cat "$POOL_INDEX_FILE" 2>/dev/null || echo "0")
    fi
    # Extract task at index from pool file (numbered 1–8)
    TARGET=$((POOL_INDEX + 1))
    NEXT_TASK=$(grep -E "^${TARGET}\. \*\*" "$POOL_FILE" 2>/dev/null | sed 's/^[0-9]*\. \*\*//;s/\*\*//' | head -1 || echo "Passive income idea scan")
    [[ -z "$NEXT_TASK" ]] && NEXT_TASK="Passive income idea scan"
    # Advance index (cycle 0–7)
    NEW_INDEX=$(( (POOL_INDEX + 1) % 8 ))
    echo "$NEW_INDEX" > "$POOL_INDEX_FILE"
    fi  # close if [[ "$IN_PROG_COUNT" -gt 0 ]]
  fi    # close if [[ -n "$HAL_TASK_JSON" ]]
fi      # close if [[ "$IS_IDLE" == "true" ]]

# ── 3. Output JSON ────────────────────────────────────────────────────────────
IDLE_BOOL=$( [[ $IS_IDLE == true ]] && echo 'true' || echo 'false' )
python3 - "$IDLE_BOOL" "$IDLE_MINUTES" "$IDLE_THRESHOLD_MIN" "$SUGGESTED_ACTION" "$NEXT_TASK" <<'PY'
import sys,json
idle_bool, idle_min, threshold, action, task = sys.argv[1:6]
print(json.dumps({
  "idle": idle_bool == "true",
  "idle_minutes": int(idle_min),
  "threshold_minutes": int(threshold),
  "suggested_action": action,
  "next_task": task[:200]
}))
PY
