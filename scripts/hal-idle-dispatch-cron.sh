#!/bin/bash
# hal-idle-dispatch-cron.sh
# Self-dispatching: runs as a LaunchAgent every 15 min, NO Alfred LLM needed.
# Dispatches directly to HAL's REMOTE gateway (192.168.2.79) via hal-dispatch-ws.js.
# HAL runs Qwen 2.5 Coder 14B locally — zero API rate limits consumed.
#
# Flow:
#   1. Check if HAL ran a Kanban task recently (10-min cooldown)
#   2. Try Kanban To Do (blocked if a card is already in_progress)
#   3. If blocked/empty → try proactive pool (15-min cooldown, no board move needed)
#   4. Dispatch directly to HAL via WebSocket (no LLM intermediary)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE="${SCRIPT_DIR%/scripts}"
TRACK_DIR="$WORKSPACE/.hal-alfred-tracking"
DISPATCH_LOG="$TRACK_DIR/dispatch.jsonl"
POOL_FILE="$WORKSPACE/HAL-PROACTIVE-TASKS.md"
POOL_INDEX_FILE="$TRACK_DIR/proactive-pool-index.txt"
LOG="$TRACK_DIR/hal-dispatch.log"

mkdir -p "$TRACK_DIR"
ts() { date '+%Y-%m-%dT%H:%M:%S%z'; }
log() { echo "[$(ts)] $*" | tee -a "$LOG"; }

# Check forced-idle state — skip all dispatches during maintenance
FORCED_IDLE_FILE="$TRACK_DIR/hal-forced-idle.json"
if [[ -f "$FORCED_IDLE_FILE" ]]; then
  IS_FORCED=$(python3 -c "import json; print(json.load(open('$FORCED_IDLE_FILE')).get('forcedIdle',False))" 2>/dev/null || echo "False")
  if [[ "$IS_FORCED" == "True" ]]; then
    log "SKIP: HAL is in forced idle (maintenance). Wake from Command Center to resume."
    echo "[ACTION:SKIP] reason=forced_idle_maintenance"
    exit 0
  fi
fi

KANBAN_COOLDOWN_MIN=10   # don't re-dispatch a Kanban task within 10 min
PROACTIVE_COOLDOWN_MIN=15 # don't re-dispatch a proactive task within 15 min

# ── HAL gateway health backoff ─────────────────────────────────────────────────
# If HAL gateway is unreachable, back off exponentially to avoid wasting process slots
FAIL_COUNT_FILE="$TRACK_DIR/hal-dispatch-fail-count.txt"
FAIL_COUNT=0
[[ -f "$FAIL_COUNT_FILE" ]] && FAIL_COUNT=$(cat "$FAIL_COUNT_FILE" 2>/dev/null || echo "0")
# After 3+ consecutive failures, only try every 4th run (~hourly instead of 15 min)
if [[ "$FAIL_COUNT" -ge 3 ]]; then
  if [[ $(( FAIL_COUNT % 4 )) -ne 0 ]]; then
    log "SKIP: HAL gateway unreachable ($FAIL_COUNT consecutive failures, backing off)"
    echo "$((FAIL_COUNT + 1))" > "$FAIL_COUNT_FILE"
    echo "[ACTION:SKIP] reason=hal_offline_backoff fail_count=${FAIL_COUNT}"
    exit 0
  fi
  log "RETRY: HAL gateway check (attempt after $FAIL_COUNT failures)"
fi

# ── Helper: minutes since last dispatch of a given type ─────────────────────
minutes_since_last_dispatch() {
  local type_filter="${1:-any}"  # "kanban", "proactive", or "any"
  if [[ ! -f "$DISPATCH_LOG" ]]; then echo "9999"; return; fi

  python3 - "$type_filter" <<'PY' < "$DISPATCH_LOG"
import sys, json, datetime
filter_type = sys.argv[1]
now = datetime.datetime.utcnow()
latest_age = 9999
for line in sys.stdin:
    try:
        d = json.loads(line)
        # Only look at successful HAL dispatches
        if d.get('route') != 'HAL': continue
        if d.get('dispatch_result') not in ('dispatched_to_hal', 'dispatched_proactive'): continue
        if filter_type == 'kanban' and d.get('dispatch_type') != 'kanban': continue
        if filter_type == 'proactive' and d.get('dispatch_type') != 'proactive': continue
        ts_str = d.get('timestamp', '')
        if ts_str.endswith('Z'): ts_str = ts_str[:-1] + '+00:00'
        t = datetime.datetime.fromisoformat(ts_str).replace(tzinfo=None)
        age = (now - t).total_seconds() / 60
        if age < latest_age:
            latest_age = age
    except Exception:
        pass
print(int(latest_age))
PY
}

# ── 1. Check Kanban cooldown ─────────────────────────────────────────────────
SINCE_KANBAN=$(minutes_since_last_dispatch "kanban")
[[ -z "${SINCE_KANBAN:-}" || ! "$SINCE_KANBAN" =~ ^[0-9]+$ ]] && SINCE_KANBAN=9999
if [[ "$SINCE_KANBAN" -lt "$KANBAN_COOLDOWN_MIN" ]]; then
  log "SKIP: Kanban dispatch ${SINCE_KANBAN}m ago (cooldown ${KANBAN_COOLDOWN_MIN}m)"
  echo "[ACTION:SKIP] reason=kanban_cooldown since_min=${SINCE_KANBAN}"
  exit 0
fi

# ── 2. Try Kanban To Do ───────────────────────────────────────────────────────
TASK_JSON=$("$SCRIPT_DIR/hal-get-idle-task.sh" 2>/dev/null || echo "")

if [[ -n "$TASK_JSON" ]]; then
  TASK_ID=$(echo "$TASK_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['task_id'])" 2>/dev/null || echo "")
  TITLE=$(echo "$TASK_JSON"   | python3 -c "import sys,json; print(json.load(sys.stdin)['title'])" 2>/dev/null || echo "")
  DESC=$(echo "$TASK_JSON"    | python3 -c "import sys,json; print(json.load(sys.stdin).get('description',''))" 2>/dev/null || echo "")
  PRIORITY=$(echo "$TASK_JSON"| python3 -c "import sys,json; print(json.load(sys.stdin).get('priority','normal'))" 2>/dev/null || echo "normal")

  if [[ -n "$TASK_ID" && -n "$TITLE" ]]; then
    log "DISPATCH_KANBAN: [$TASK_ID] $TITLE (priority=$PRIORITY)"

    # Build task message for HAL
    TASK_MSG="[KANBAN-TASK] ID: ${TASK_ID} | Priority: ${PRIORITY}
Title: ${TITLE}
${DESC:+Description: ${DESC}}
Instructions: Complete this task. When done, report your results."

    # Dispatch directly to HAL via WebSocket (no Alfred LLM needed)
    DISPATCH_OUT=$(timeout 45 node "$SCRIPT_DIR/hal-dispatch-ws.js" "$TASK_MSG" 2>&1) && {
      log "DISPATCH_OK: $DISPATCH_OUT"
      echo "0" > "$FAIL_COUNT_FILE"  # Reset fail counter on success
      # Log the successful dispatch
      python3 - "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" "$TASK_ID" "HAL" "$TITLE" "kanban" <<'PY' >> "$DISPATCH_LOG"
import sys, json
ts, tid, route, task, dtype = sys.argv[1:6]
print(json.dumps({"timestamp":ts,"task_id":tid,"route":route,"dispatch_result":"dispatched_to_hal","dispatch_type":dtype,"task":task[:200]},separators=(',',':')))
PY
      echo "[ACTION:DISPATCH_KANBAN] task_id=${TASK_ID} priority=${PRIORITY}"
    } || {
      log "DISPATCH_FAILED: exit=$? output=$DISPATCH_OUT"
      echo "$((FAIL_COUNT + 1))" > "$FAIL_COUNT_FILE"  # Increment fail counter
      echo "[ACTION:SKIP] reason=dispatch_failed task_id=${TASK_ID}"
    }
    exit 0
  fi
fi

# ── 3. No Kanban task — check why and fall through to proactive ──────────────
# Check whether board is blocked (in_progress) or just empty todo
BOARD_JSON=$(curl -s --max-time 10 "http://localhost:3001/api/kanban" 2>/dev/null || echo "{}")
IN_PROG_COUNT=$(echo "$BOARD_JSON" | python3 -c "
import sys,json
b=json.load(sys.stdin)
print(len(b.get('columns',{}).get('in_progress',[])))
" 2>/dev/null || echo "0")
IN_PROG_TITLE=$(echo "$BOARD_JSON" | python3 -c "
import sys,json
cards=json.load(sys.stdin).get('columns',{}).get('in_progress',[])
print(cards[0].get('title','') if cards else '')
" 2>/dev/null || echo "")

if [[ "$IN_PROG_COUNT" -gt 0 ]]; then
  log "Kanban slot occupied: '$IN_PROG_TITLE' — falling through to proactive pool"
else
  log "No HAL-qualifying tasks in To Do — falling through to proactive pool"
fi

# ── 4. Proactive pool cooldown check ────────────────────────────────────────
SINCE_PROACTIVE=$(minutes_since_last_dispatch "proactive")
SINCE_ANY=$(minutes_since_last_dispatch "any")
[[ -z "${SINCE_PROACTIVE:-}" || ! "$SINCE_PROACTIVE" =~ ^[0-9]+$ ]] && SINCE_PROACTIVE=9999
[[ -z "${SINCE_ANY:-}" || ! "$SINCE_ANY" =~ ^[0-9]+$ ]] && SINCE_ANY=9999

if [[ "$SINCE_PROACTIVE" -lt "$PROACTIVE_COOLDOWN_MIN" ]]; then
  log "SKIP: Proactive dispatch ${SINCE_PROACTIVE}m ago (cooldown ${PROACTIVE_COOLDOWN_MIN}m)"
  echo "[ACTION:SKIP] reason=proactive_cooldown since_min=${SINCE_PROACTIVE} kanban_blocked=${IN_PROG_TITLE}"
  exit 0
fi

# ── 5. Pick next proactive task from pool ────────────────────────────────────
POOL_INDEX=0
[[ -f "$POOL_INDEX_FILE" ]] && POOL_INDEX=$(cat "$POOL_INDEX_FILE" 2>/dev/null || echo "0")

# Pool has 16 tasks (1-indexed in file, 0-indexed here)
POOL_SIZE=16
TARGET_LINE=$((POOL_INDEX + 1))

# Extract task title
NEXT_TASK=$(grep -E "^${TARGET_LINE}\. \*\*" "$POOL_FILE" 2>/dev/null \
  | sed 's/^[0-9]*\. \*\*//;s/\*\*//' | head -1 || echo "")

# Extract full task block (title + description, up to blank line before next numbered item)
TASK_BLOCK=$(awk "
  /^${TARGET_LINE}\\. \\*\\*/ { found=1 }
  found && /^[0-9]+\\. \\*\\*/ && !/^${TARGET_LINE}\\. \\*\\*/ { exit }
  found { print }
" "$POOL_FILE" 2>/dev/null | head -10 || echo "$NEXT_TASK")

[[ -z "$NEXT_TASK" ]] && NEXT_TASK="Passive income idea scan"

# Advance pool index (cycles 0 → 15 → 0)
NEW_INDEX=$(( (POOL_INDEX + 1) % POOL_SIZE ))
echo "$NEW_INDEX" > "$POOL_INDEX_FILE"

# Build task message for HAL
PROACTIVE_MSG="[PROACTIVE-TASK] Pool #${TARGET_LINE}: ${NEXT_TASK}
${TASK_BLOCK}
Instructions: Execute this proactive task. Report findings and any actions taken."

# Dispatch directly to HAL via WebSocket
PROACTIVE_ID="proactive_$(date +%s)"
DISPATCH_OUT=$(timeout 45 node "$SCRIPT_DIR/hal-dispatch-ws.js" "$PROACTIVE_MSG" 2>&1) && {
  log "DISPATCH_PROACTIVE: pool_index=${POOL_INDEX} task=${NEXT_TASK} — $DISPATCH_OUT"
  echo "0" > "$FAIL_COUNT_FILE"  # Reset fail counter on success
  # Log the successful dispatch
  python3 - "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" "$PROACTIVE_ID" "HAL" "$NEXT_TASK" "proactive" <<'PY' >> "$DISPATCH_LOG"
import sys, json
ts, tid, route, task, dtype = sys.argv[1:6]
print(json.dumps({"timestamp":ts,"task_id":tid,"route":route,"dispatch_result":"dispatched_proactive","dispatch_type":dtype,"task":task[:200]},separators=(',',':')))
PY
  echo "[ACTION:DISPATCH_PROACTIVE] pool_index=${POOL_INDEX} pool_target=${TARGET_LINE}"
} || {
  log "DISPATCH_FAILED: pool_index=${POOL_INDEX} task=${NEXT_TASK} — exit=$? output=$DISPATCH_OUT"
  echo "$((FAIL_COUNT + 1))" > "$FAIL_COUNT_FILE"  # Increment fail counter
  echo "[ACTION:SKIP] reason=proactive_dispatch_failed"
}
