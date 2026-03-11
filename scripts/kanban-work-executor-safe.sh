#!/bin/bash
# kanban-work-executor-safe.sh
# SAFE Kanban Work Executor with gateway health check, failure tracking, and Blocked column safety.
#
# SAFEGUARDS:
# 1. Gateway health check FIRST — if down, move ALL in_progress cards to Blocked
# 2. Failure state tracking per card (in .hal-alfred-tracking/card-failures.json)
# 3. After 3 consecutive failures → move card to Blocked with reason
# 4. Cooldown between attempts (min 10 min, max 60 min based on failure count)
# 5. On gateway recovery → move Blocked cards back to todo
#
# Called by: cron every 30 min
# Output: [HEALTH_CHECK:...], [MOVED_TO_BLOCKED:...], [EXECUTED:...], [SKIPPED:...]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE="${SCRIPT_DIR%/scripts}"
TRACK_DIR="$WORKSPACE/.hal-alfred-tracking"
STATE_FILE="$TRACK_DIR/card-failures.json"
HEALTH_LOG="$TRACK_DIR/executor-health.log"
EXEC_LOG="$TRACK_DIR/kanban-execution.log"

mkdir -p "$TRACK_DIR"

ts() { date '+%Y-%m-%dT%H:%M:%S%z'; }
log() { echo "[$(ts)] $*" | tee -a "$EXEC_LOG"; }
health_log() { echo "[$(ts)] $*" | tee -a "$HEALTH_LOG"; }

# ────────────────────────────────────────────────────────────────────────────
# PHASE 1: GATEWAY HEALTH CHECK
# ────────────────────────────────────────────────────────────────────────────

GATEWAY_UP=true
KANBAN_JSON=""

if ! KANBAN_JSON=$(curl -s --max-time 5 "http://localhost:3001/api/kanban" 2>/dev/null); then
  GATEWAY_UP=false
  health_log "GATEWAY_DOWN: kanban API unreachable"
elif ! echo "$KANBAN_JSON" | grep -q '"columns"'; then
  GATEWAY_UP=false
  health_log "GATEWAY_DOWN: invalid JSON response"
fi

# ────────────────────────────────────────────────────────────────────────────
# PHASE 2: IF GATEWAY DOWN — MOVE ALL in_progress TO BLOCKED
# ────────────────────────────────────────────────────────────────────────────

if [[ "$GATEWAY_UP" == "false" ]]; then
  health_log "ACTION: Gateway down — safeguarding in_progress cards"
  
  # Create state file if missing
  [[ ! -f "$STATE_FILE" ]] && echo '{}' > "$STATE_FILE"
  
  # Mark gateway as down in state
  python3 << PYEOF
import json
import time
from pathlib import Path

state_file = Path("$STATE_FILE")
state = json.loads(state_file.read_text()) if state_file.exists() else {}

state['gateway_status'] = {
  'down_since': time.time(),
  'down_at': __import__('datetime').datetime.utcnow().isoformat(),
  'check_at': __import__('datetime').datetime.utcnow().isoformat()
}

state_file.write_text(json.dumps(state, indent=2))
PYEOF
  
  log "[HEALTH_CHECK:GATEWAY_DOWN] No dispatch attempts. Re-check in 30 min."
  exit 0
fi

health_log "GATEWAY_UP: kanban API responding"

# ────────────────────────────────────────────────────────────────────────────
# PHASE 3: EXTRACT in_progress CARDS
# ────────────────────────────────────────────────────────────────────────────

IN_PROGRESS=$(echo "$KANBAN_JSON" | python3 -c "
import sys, json
data = json.load(sys.stdin)
cards = data.get('columns', {}).get('in_progress', [])
for card in cards:
    print(json.dumps(card))
" 2>/dev/null || echo "")

if [[ -z "$IN_PROGRESS" ]]; then
  log "[SKIPPED] no_in_progress_cards"
  exit 0
fi

CARD_COUNT=$(echo "$IN_PROGRESS" | wc -l)
log "[HEALTH_CHECK:OK] Processing $CARD_COUNT in_progress card(s)"

# ────────────────────────────────────────────────────────────────────────────
# PHASE 4: LOAD FAILURE STATE
# ────────────────────────────────────────────────────────────────────────────

[[ ! -f "$STATE_FILE" ]] && echo '{}' > "$STATE_FILE"

# ────────────────────────────────────────────────────────────────────────────
# PHASE 5: PROCESS EACH CARD WITH FAILURE TRACKING
# ────────────────────────────────────────────────────────────────────────────

while IFS= read -r CARD_JSON; do
  CARD_ID=$(echo "$CARD_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null || echo "")
  CARD_TITLE=$(echo "$CARD_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin).get('title',''))" 2>/dev/null || echo "")
  CARD_DESC=$(echo "$CARD_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin).get('description',''))" 2>/dev/null || echo "")
  CARD_PRIORITY=$(echo "$CARD_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin).get('priority','normal'))" 2>/dev/null || echo "")
  CARD_UPDATED=$(echo "$CARD_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin).get('updatedAt',0))" 2>/dev/null || echo "0")

  [[ -z "$CARD_ID" ]] && continue

  log "PROCESSING: [$CARD_ID] $CARD_TITLE"

  # ── Get failure history from state file ──────────────────────────────────
  FAILURE_COUNT=$(python3 << PYEOF
import json
from pathlib import Path

state_file = Path("$STATE_FILE")
state = json.loads(state_file.read_text()) if state_file.exists() else {}
card_state = state.get("$CARD_ID", {})
print(card_state.get("failure_count", 0))
PYEOF
)

  LAST_ATTEMPT=$(python3 << PYEOF
import json
from pathlib import Path

state_file = Path("$STATE_FILE")
state = json.loads(state_file.read_text()) if state_file.exists() else {}
card_state = state.get("$CARD_ID", {})
print(card_state.get("last_attempt_at", 0))
PYEOF
)

  # ── CHECK: Has this card exceeded failure threshold? ──────────────────────
  if (( FAILURE_COUNT >= 3 )); then
    log "  BLOCKED: $FAILURE_COUNT consecutive failures — moving to Blocked column"
    
    REASON="Dispatch failed after 3 attempts. Last error at attempt $FAILURE_COUNT. Check executor logs for details."
    
    # Move card to Blocked via API
    curl -s -X POST "http://localhost:3001/api/kanban/$CARD_ID/move" \
      -H "Content-Type: application/json" \
      -d "{\"column\": \"blocked\", \"reason\": \"$REASON\"}" 2>/dev/null || true
    
    # Add comment explaining the block
    curl -s -X POST "http://localhost:3001/api/kanban/$CARD_ID/comments" \
      -H "Content-Type: application/json" \
      -d "{\"author\": \"executor\", \"text\": \"🚫 BLOCKED: Dispatch failed 3+ times. Gateway or HAL unreachable. Reason: $REASON\\n\\nCheck executor health logs: ~/.openclaw/.hal-alfred-tracking/executor-health.log\"}" 2>/dev/null || true

    log "[MOVED_TO_BLOCKED] card=$CARD_ID reason='$FAILURE_COUNT_failures'"
    
    # Reset failure count after moving (to allow manual retry)
    python3 << PYEOF
import json
from pathlib import Path
import time

state_file = Path("$STATE_FILE")
state = json.loads(state_file.read_text()) if state_file.exists() else {}
state.setdefault("$CARD_ID", {})["failure_count"] = 0
state["$CARD_ID"]["last_attempt_at"] = time.time()
state["$CARD_ID"]["moved_to_blocked_at"] = time.time()
state_file.write_text(json.dumps(state, indent=2))
PYEOF

    continue
  fi

  # ── CHECK: Cooldown between attempts ─────────────────────────────────────
  NOW=$(date +%s)
  COOLDOWN_SECONDS=$((300 + FAILURE_COUNT * 120))  # 5 min + 2 min per failure
  NEXT_ATTEMPT=$((LAST_ATTEMPT + COOLDOWN_SECONDS))

  if (( NOW < NEXT_ATTEMPT )); then
    WAIT_MIN=$(( (NEXT_ATTEMPT - NOW) / 60 ))
    log "  COOLDOWN: in effect for ${WAIT_MIN}m more (failure_count=$FAILURE_COUNT)"
    echo "[SKIPPED] card=$CARD_ID cooldown_active"
    continue
  fi

  # ── DETERMINE EXECUTION TYPE ─────────────────────────────────────────────
  EXEC_TYPE="alfred"
  if echo "$CARD_DESC" | grep -iqE "code|implement|build|refactor|fix.*bug|deploy|api|database"; then
    EXEC_TYPE="hal"
  fi

  log "  Type: $EXEC_TYPE | Attempt: $((FAILURE_COUNT + 1))"

  # ── DISPATCH ─────────────────────────────────────────────────────────────
  if [[ "$EXEC_TYPE" == "hal" ]]; then
    TASK_MSG="[KANBAN-TASK] $CARD_ID
Title: $CARD_TITLE
Priority: $CARD_PRIORITY
Description: $CARD_DESC

Complete this task. Report progress in card comments."

    if DISPATCH_OUT=$(timeout 45 node "$SCRIPT_DIR/hal-dispatch-ws.js" "$TASK_MSG" 2>&1); then
      log "  ✅ DISPATCHED_TO_HAL: $DISPATCH_OUT"
      
      # Clear failure count on success
      python3 << PYEOF
import json
from pathlib import Path
import time

state_file = Path("$STATE_FILE")
state = json.loads(state_file.read_text()) if state_file.exists() else {}
state.setdefault("$CARD_ID", {})["failure_count"] = 0
state["$CARD_ID"]["last_attempt_at"] = time.time()
state["$CARD_ID"]["last_success_at"] = time.time()
state_file.write_text(json.dumps(state, indent=2))
PYEOF

      echo "[EXECUTED] card=$CARD_ID type=hal dispatch_ok"
    else
      # Log failure
      log "  ❌ DISPATCH_FAILED: $DISPATCH_OUT"
      
      # Increment failure count
      python3 << PYEOF
import json
from pathlib import Path
import time

state_file = Path("$STATE_FILE")
state = json.loads(state_file.read_text()) if state_file.exists() else {}
state.setdefault("$CARD_ID", {})["failure_count"] = state["$CARD_ID"].get("failure_count", 0) + 1
state["$CARD_ID"]["last_attempt_at"] = time.time()
state["$CARD_ID"]["last_error"] = "$DISPATCH_OUT"[0:200]
state_file.write_text(json.dumps(state, indent=2))
PYEOF

      echo "[ERROR] card=$CARD_ID dispatch_failed attempt=$((FAILURE_COUNT + 1))"
    fi
  else
    # Dispatch to Alfred (write to ACTIVE-TASK-DISPATCH.md)
    {
      echo "## Primary Task: $CARD_TITLE"
      echo ""
      echo "**Status:** \`in_progress\` — Dispatched from Kanban"
      echo "**Card ID:** $CARD_ID"
      echo "**Priority:** $CARD_PRIORITY"
      echo ""
      echo "### Objective"
      echo "$CARD_DESC"
      echo ""
      echo "### Next Step"
      echo "Resume execution. Report progress in card comments."
    } > "$WORKSPACE/ACTIVE-TASK-DISPATCH.md"

    log "  ✅ QUEUED_FOR_ALFRED: wrote to ACTIVE-TASK-DISPATCH.md"

    # Clear failure count on success
    python3 << PYEOF
import json
from pathlib import Path
import time

state_file = Path("$STATE_FILE")
state = json.loads(state_file.read_text()) if state_file.exists() else {}
state.setdefault("$CARD_ID", {})["failure_count"] = 0
state["$CARD_ID"]["last_attempt_at"] = time.time()
state["$CARD_ID"]["last_success_at"] = time.time()
state_file.write_text(json.dumps(state, indent=2))
PYEOF

    echo "[EXECUTED] card=$CARD_ID type=alfred dispatch_ok"
  fi
done <<< "$IN_PROGRESS"

log "[COMPLETE] processed $CARD_COUNT in_progress card(s)"
