#!/bin/bash
# alfred-proactive-check.sh
# Called when Alfred has no Kanban work. Outputs structured [ACTION:...] lines.
# Alfred executes [ACTION:DO_PROACTIVE] tasks directly (no sessions_spawn needed).
#
# Usage: bash alfred-proactive-check.sh
# Output:
#   [ACTION:DO_PROACTIVE] pool_index=<n> pool_target=<1-8>
#   task_title=<title>
#   ---TASK_BLOCK_START---
#   <full task description>
#   ---TASK_BLOCK_END---
#
#   [ACTION:SKIP] reason=<reason>

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE="${SCRIPT_DIR%/scripts}"
TRACK_DIR="$WORKSPACE/.hal-alfred-tracking"
POOL_FILE="$WORKSPACE/ALFRED-PROACTIVE-TASKS.md"
POOL_INDEX_FILE="$TRACK_DIR/alfred-proactive-pool-index.txt"
DISPATCH_LOG="$TRACK_DIR/alfred-proactive.jsonl"
LOG="$TRACK_DIR/alfred-proactive.log"

mkdir -p "$TRACK_DIR"
ts()  { date '+%Y-%m-%dT%H:%M:%S%z'; }
log() { echo "[$(ts)] $*" | tee -a "$LOG"; }

# ── Config ───────────────────────────────────────────────────────────────────
PROACTIVE_COOLDOWN_MIN=90   # don't re-dispatch Alfred proactive within 90 min
POOL_SIZE=9
# Quiet hours = no messages TO JOE. Alfred and HAL still work 24/7.

# ── Cooldown check ───────────────────────────────────────────────────────────
SINCE_LAST=9999
if [[ -f "$DISPATCH_LOG" ]]; then
  SINCE_LAST=$(tail -n 10 "$DISPATCH_LOG" | python3 -c "
import sys, json, datetime
now = datetime.datetime.utcnow()
latest = 9999
for line in sys.stdin:
    try:
        d = json.loads(line)
        ts_str = d.get('timestamp', '')
        if not ts_str: continue
        if ts_str.endswith('Z'): ts_str = ts_str[:-1] + '+00:00'
        t = datetime.datetime.fromisoformat(ts_str).replace(tzinfo=None)
        age = (now - t).total_seconds() / 60
        if age < latest: latest = age
    except Exception:
        pass
print(int(latest))
" 2>/dev/null || echo "9999")
fi

[[ -z "${SINCE_LAST:-}" || ! "$SINCE_LAST" =~ ^[0-9]+$ ]] && SINCE_LAST=9999

if [[ "$SINCE_LAST" -lt "$PROACTIVE_COOLDOWN_MIN" ]]; then
  log "SKIP: Alfred proactive ran ${SINCE_LAST}m ago (cooldown ${PROACTIVE_COOLDOWN_MIN}m)"
  echo "[ACTION:SKIP] reason=cooldown since_min=${SINCE_LAST}"
  exit 0
fi

# ── Pick next pool task ───────────────────────────────────────────────────────
POOL_INDEX=0
[[ -f "$POOL_INDEX_FILE" ]] && POOL_INDEX=$(cat "$POOL_INDEX_FILE" 2>/dev/null || echo "0")
[[ ! "$POOL_INDEX" =~ ^[0-9]+$ ]] && POOL_INDEX=0

TARGET_LINE=$((POOL_INDEX + 1))

# Extract task title (line like: "1. **Title**")
NEXT_TASK=$(grep -E "^${TARGET_LINE}\. \*\*" "$POOL_FILE" 2>/dev/null \
  | sed 's/^[0-9]*\. \*\*//;s/\*\*//' | head -1 || echo "")

# Extract full task block
TASK_BLOCK=$(awk "
  /^${TARGET_LINE}\\. \\*\\*/ { found=1 }
  found && /^[0-9]+\\. \\*\\*/ && !/^${TARGET_LINE}\\. \\*\\*/ { exit }
  found { print }
" "$POOL_FILE" 2>/dev/null | head -15 || echo "$NEXT_TASK")

if [[ -z "$NEXT_TASK" ]]; then
  log "SKIP: Could not parse task at pool_index=${POOL_INDEX}"
  echo "[ACTION:SKIP] reason=pool_parse_error"
  exit 0
fi

# Advance pool index
NEW_INDEX=$(( (POOL_INDEX + 1) % POOL_SIZE ))
echo "$NEW_INDEX" > "$POOL_INDEX_FILE"

# Log dispatch
python3 - "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" "alfred_proactive_$(date +%s)" "$NEXT_TASK" "$POOL_INDEX" <<'PY' >> "$DISPATCH_LOG"
import sys, json
ts, tid, task, idx = sys.argv[1:5]
print(json.dumps({
  "timestamp": ts,
  "task_id": tid,
  "task": task[:200],
  "pool_index": int(idx)
}, separators=(',',':')))
PY

log "DO_PROACTIVE: pool_index=${POOL_INDEX} task=${NEXT_TASK}"
echo "[ACTION:DO_PROACTIVE] pool_index=${POOL_INDEX} pool_target=${TARGET_LINE}"
echo "task_title=${NEXT_TASK}"
echo "---TASK_BLOCK_START---"
echo "$TASK_BLOCK"
echo "---TASK_BLOCK_END---"
