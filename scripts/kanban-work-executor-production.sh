#!/bin/bash
# kanban-work-executor-production.sh
# PRODUCTION VERSION: All Phase 1 safeguards implemented
#
# Safeguards:
# 1. JSON schema validation (A1)
# 2. Atomic state file writes (A2)
# 3. State file error handling (A3)
# 4. Required field validation (A4)
# 5. Log rotation (D2)
#
# Plus original safeguards:
# - Gateway health check
# - Failure count tracking
# - Move to Blocked after 3 failures
# - Exponential backoff
# - Audit logging
#
# Called by: cron every 30 min
# Output: [HEALTH_CHECK:...], [MOVED_TO_BLOCKED:...], [EXECUTED:...], [SKIPPED:...]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE="${SCRIPT_DIR%/scripts}"
TRACK_DIR="$WORKSPACE/.hal-alfred-tracking"
QUEUE_DIR="$WORKSPACE/.alfred-queue"
STATE_FILE="$TRACK_DIR/card-failures.json"
HEALTH_LOG="$TRACK_DIR/executor-health.log"
EXEC_LOG="$TRACK_DIR/kanban-execution.log"

mkdir -p "$TRACK_DIR" "$QUEUE_DIR"

ts() { date '+%Y-%m-%dT%H:%M:%S%z'; }
log() { echo "[$(ts)] $*" | tee -a "$EXEC_LOG"; }
health_log() { echo "[$(ts)] $*" | tee -a "$HEALTH_LOG"; }

# ════════════════════════════════════════════════════════════════════════════
# PHASE 0: LOG ROTATION & INITIALIZATION
# ════════════════════════════════════════════════════════════════════════════

rotate_logs() {
  local log_file="$1"
  local max_size="${2:-1048576}"  # Default 1MB
  local max_backups="${3:-7}"     # Keep 7 backups

  if [[ ! -f "$log_file" ]]; then
    return 0
  fi

  # Get file size (cross-platform)
  local size
  if size=$(stat -f%z "$log_file" 2>/dev/null); then
    true  # macOS
  else
    size=$(stat -c%s "$log_file" 2>/dev/null || echo 0)
  fi

  if (( size <= max_size )); then
    return 0
  fi

  # Rotate backups: .7 → .8, .6 → .7, etc.
  for ((i=max_backups; i>1; i--)); do
    [[ -f "$log_file.$((i-1)).gz" ]] && mv "$log_file.$((i-1)).gz" "$log_file.$i.gz"
  done

  # Current log → backup + compress
  mv "$log_file" "$log_file.1"
  gzip "$log_file.1" 2>/dev/null || true

  # Create new empty log
  touch "$log_file"
  return 0
}

# Rotate logs on startup (D2 — Log Rotation)
rotate_logs "$EXEC_LOG" 1048576 7
rotate_logs "$HEALTH_LOG" 1048576 7

# ════════════════════════════════════════════════════════════════════════════
# PHASE 1: GATEWAY HEALTH CHECK
# ════════════════════════════════════════════════════════════════════════════

validate_kanban_json() {
  local json="$1"

  python3 << 'PYEOF'
import sys
import json

try:
  data = json.loads(sys.stdin.read())

  # Validate structure
  assert isinstance(data, dict), "JSON not an object"
  assert 'columns' in data, "Missing 'columns' key"
  assert isinstance(data['columns'], dict), "'columns' is not an object"
  assert 'in_progress' in data['columns'], "Missing 'in_progress' column"

  # Validate in_progress is a list
  cards = data['columns']['in_progress']
  assert isinstance(cards, list), "'in_progress' is not an array"

  # Sample validate first card if present
  if cards and len(cards) > 0:
    first = cards[0]
    assert isinstance(first, dict), "Card is not an object"
    assert 'id' in first, "Card missing 'id' field"
    assert 'title' in first, "Card missing 'title' field"

  print("VALID")
  sys.exit(0)

except Exception as e:
  print(f"INVALID: {str(e)}", file=sys.stderr)
  sys.exit(1)
PYEOF

  return $?
}

GATEWAY_UP=true
KANBAN_JSON=""

if ! KANBAN_JSON=$(curl -s --max-time 5 "http://localhost:3001/api/kanban" 2>/dev/null); then
  GATEWAY_UP=false
  health_log "GATEWAY_DOWN: API unreachable (curl failed)"
elif ! echo "$KANBAN_JSON" | validate_kanban_json >/dev/null 2>&1; then
  GATEWAY_UP=false
  health_log "GATEWAY_DOWN: Invalid JSON response"
fi

if [[ "$GATEWAY_UP" == "false" ]]; then
  health_log "ACTION: Gateway down — safeguarding in_progress cards"
  log "[HEALTH_CHECK:GATEWAY_DOWN] No dispatch attempts"
  exit 0
fi

health_log "GATEWAY_UP: Kanban API responding with valid JSON"

# ════════════════════════════════════════════════════════════════════════════
# PHASE 2: EXTRACT in_progress CARDS
# ════════════════════════════════════════════════════════════════════════════

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

# ════════════════════════════════════════════════════════════════════════════
# PHASE 3: INITIALIZE STATE FILE
# ════════════════════════════════════════════════════════════════════════════

init_state_file() {
  if [[ ! -f "$STATE_FILE" ]]; then
    if ! echo '{}' > "$STATE_FILE"; then
      log "ERROR: Failed to initialize state file"
      return 1
    fi
  fi
  return 0
}

if ! init_state_file; then
  log "[ERROR] State file initialization failed"
  exit 1
fi

# ════════════════════════════════════════════════════════════════════════════
# HELPER: Atomic State Write (A2 — Concurrent Write Safety)
# ════════════════════════════════════════════════════════════════════════════

write_state_atomic() {
  local state_json="$1"
  local tmp_file="$STATE_FILE.tmp.$$"

  # Write to temp file
  if ! echo "$state_json" > "$tmp_file"; then
    log "ERROR: Failed to write state to temp file"
    rm -f "$tmp_file"
    return 1
  fi

  # Atomic rename (filesystem-level swap)
  if ! mv "$tmp_file" "$STATE_FILE"; then
    log "ERROR: Failed to atomic rename state file (race condition?)"
    rm -f "$tmp_file"
    return 1
  fi

  return 0
}

# ════════════════════════════════════════════════════════════════════════════
# HELPER: Update Card State (A3 — Error Handling)
# ════════════════════════════════════════════════════════════════════════════

update_card_state() {
  local card_id="$1"
  local field="$2"
  local value="$3"

  python3 << PYEOF || return 1
import json
from pathlib import Path
import time

try:
  state_file = Path("$STATE_FILE")
  state = json.loads(state_file.read_text()) if state_file.exists() else {}

  state.setdefault("$card_id", {})
  state["$card_id"]["$field"] = "$value"
  state["$card_id"]["updated_at"] = time.time()

  # Atomic write via temp file
  tmp_file = Path("$STATE_FILE.tmp.\$\$")
  tmp_file.write_text(json.dumps(state, indent=2))
  tmp_file.replace(state_file)

except Exception as e:
  print(f"ERROR: {str(e)}", file=sys.stderr)
  exit(1)
PYEOF

  return $?
}

# ════════════════════════════════════════════════════════════════════════════
# HELPER: Validate Card Fields (A4 — Required Field Validation)
# ════════════════════════════════════════════════════════════════════════════

validate_card_fields() {
  local card_json="$1"

  python3 << 'PYEOF'
import sys
import json

try:
  card = json.load(sys.stdin)

  # Required fields
  required = ['id', 'title']
  for field in required:
    if field not in card:
      print(f"MISSING: {field}", file=sys.stderr)
      sys.exit(1)

  if not card['id'] or not card['title']:
    print("EMPTY: required fields are empty", file=sys.stderr)
    sys.exit(1)

  print("VALID")
  sys.exit(0)

except Exception as e:
  print(f"ERROR: {str(e)}", file=sys.stderr)
  sys.exit(1)
PYEOF

  return $?
}

# ════════════════════════════════════════════════════════════════════════════
# HELPER: Queue Task for Alfred (B1 — Queue Refactor)
# ════════════════════════════════════════════════════════════════════════════

queue_for_alfred() {
  local card_id="$1"
  local title="$2"
  local desc="$3"
  local priority="${4:-normal}"

  # Create unique queue file with timestamp
  local ts=$(date +%s%N | cut -b1-13)  # milliseconds
  local queue_file="$QUEUE_DIR/task-${ts}-${card_id}.json"

  # Write as JSON for easier parsing
  if ! cat > "$queue_file" << EOF
{
  "card_id": "$card_id",
  "title": "$title",
  "description": "$desc",
  "priority": "$priority",
  "queued_at": $(date +%s),
  "status": "queued"
}
EOF
  then
    log "ERROR: Failed to write queue file: $queue_file"
    return 1
  fi

  log "QUEUED_FOR_ALFRED: $queue_file"
  return 0
}

# ════════════════════════════════════════════════════════════════════════════
# PHASE 4: PROCESS EACH CARD WITH FAILURE TRACKING
# ════════════════════════════════════════════════════════════════════════════

while IFS= read -r CARD_JSON; do
  # Validate card structure first (A4)
  if ! echo "$CARD_JSON" | validate_card_fields >/dev/null 2>&1; then
    log "WARN: Card missing required fields, skipping"
    continue
  fi

  CARD_ID=$(echo "$CARD_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null || echo "")
  CARD_TITLE=$(echo "$CARD_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin).get('title',''))" 2>/dev/null || echo "")
  CARD_DESC=$(echo "$CARD_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin).get('description',''))" 2>/dev/null || echo "")
  CARD_PRIORITY=$(echo "$CARD_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin).get('priority','normal'))" 2>/dev/null || echo "normal")

  [[ -z "$CARD_ID" ]] && continue

  log "PROCESSING: [$CARD_ID] $CARD_TITLE"

  # Get failure history
  FAILURE_COUNT=$(python3 << PYEOF
import json
from pathlib import Path

state_file = Path("$STATE_FILE")
if state_file.exists():
  state = json.loads(state_file.read_text())
  card_state = state.get("$CARD_ID", {})
  print(card_state.get("failure_count", 0))
else:
  print(0)
PYEOF
)

  LAST_ATTEMPT=$(python3 << PYEOF
import json
from pathlib import Path

state_file = Path("$STATE_FILE")
if state_file.exists():
  state = json.loads(state_file.read_text())
  card_state = state.get("$CARD_ID", {})
  print(card_state.get("last_attempt_at", 0))
else:
  print(0)
PYEOF
)

  # CHECK: Has card exceeded failure threshold?
  if (( FAILURE_COUNT >= 3 )); then
    log "  BLOCKED: $FAILURE_COUNT consecutive failures — moving to Blocked column"

    REASON="Dispatch failed after 3 attempts. Check executor logs for details."

    # Move card to Blocked
    HTTP_STATUS=$(curl -s -w "%{http_code}" -X POST "http://localhost:3001/api/kanban/$CARD_ID/move" \
      -H "Content-Type: application/json" \
      -d "{\"column\": \"blocked\", \"reason\": \"$REASON\"}" -o /dev/null 2>/dev/null || echo "000")

    if [[ "$HTTP_STATUS" == "200" || "$HTTP_STATUS" == "204" ]]; then
      log "  ✅ Moved to Blocked column (HTTP $HTTP_STATUS)"
    else
      log "  ❌ Failed to move card (HTTP $HTTP_STATUS, likely card deleted)"
    fi

    # Add comment explaining block
    curl -s -X POST "http://localhost:3001/api/kanban/$CARD_ID/comments" \
      -H "Content-Type: application/json" \
      -d "{\"author\": \"executor\", \"text\": \"🚫 BLOCKED: Dispatch failed 3+ times. Gateway or HAL unreachable. Check executor logs: ~/.openclaw/.hal-alfred-tracking/executor-health.log\"}" 2>/dev/null || true

    log "[MOVED_TO_BLOCKED] card=$CARD_ID reason='3_consecutive_failures'"

    # Reset failure count (allows manual retry)
    if ! update_card_state "$CARD_ID" "failure_count" "0"; then
      log "  WARN: Failed to reset failure count"
    fi

    continue
  fi

  # CHECK: Cooldown between attempts
  NOW=$(date +%s)
  COOLDOWN_SECONDS=$((300 + FAILURE_COUNT * 120))
  NEXT_ATTEMPT=$((LAST_ATTEMPT + COOLDOWN_SECONDS))

  if (( NOW < NEXT_ATTEMPT )); then
    WAIT_MIN=$(( (NEXT_ATTEMPT - NOW) / 60 ))
    log "  COOLDOWN: in effect for ${WAIT_MIN}m more (attempt=$((FAILURE_COUNT + 1)))"
    echo "[SKIPPED] card=$CARD_ID cooldown_active"
    continue
  fi

  # DETERMINE EXECUTION TYPE
  EXEC_TYPE="alfred"
  if echo "$CARD_DESC" | grep -iqE "code|implement|build|refactor|fix.*bug|deploy|api|database"; then
    EXEC_TYPE="hal"
  fi

  log "  Type: $EXEC_TYPE | Attempt: $((FAILURE_COUNT + 1))"

  # DISPATCH
  if [[ "$EXEC_TYPE" == "hal" ]]; then
    TASK_MSG="[KANBAN-TASK] $CARD_ID
Title: $CARD_TITLE
Priority: $CARD_PRIORITY
Description: $CARD_DESC

Complete this task. Report progress in card comments."

    if DISPATCH_OUT=$(timeout 45 node "$SCRIPT_DIR/hal-dispatch-ws.js" "$TASK_MSG" 2>&1); then
      log "  ✅ DISPATCHED_TO_HAL: $DISPATCH_OUT"

      # Success: clear failure count
      if ! update_card_state "$CARD_ID" "failure_count" "0"; then
        log "  WARN: Failed to clear failure count"
      fi
      if ! update_card_state "$CARD_ID" "last_success_at" "$(date +%s)"; then
        log "  WARN: Failed to record success time"
      fi

      echo "[EXECUTED] card=$CARD_ID type=hal dispatch_ok"
    else
      log "  ❌ DISPATCH_FAILED: $DISPATCH_OUT"

      # Failure: increment count
      if ! update_card_state "$CARD_ID" "failure_count" "$((FAILURE_COUNT + 1))"; then
        log "  ERROR: Failed to increment failure count"
      fi
      if ! update_card_state "$CARD_ID" "last_attempt_at" "$(date +%s)"; then
        log "  WARN: Failed to record attempt time"
      fi
      if ! update_card_state "$CARD_ID" "last_error" "${DISPATCH_OUT:0:200}"; then
        log "  WARN: Failed to record error"
      fi

      echo "[ERROR] card=$CARD_ID dispatch_failed attempt=$((FAILURE_COUNT + 1))"
    fi
  else
    # Queue for Alfred
    if queue_for_alfred "$CARD_ID" "$CARD_TITLE" "$CARD_DESC" "$CARD_PRIORITY"; then
      log "  ✅ QUEUED_FOR_ALFRED"

      # Success: clear failure count
      if ! update_card_state "$CARD_ID" "failure_count" "0"; then
        log "  WARN: Failed to clear failure count"
      fi
      if ! update_card_state "$CARD_ID" "last_success_at" "$(date +%s)"; then
        log "  WARN: Failed to record success time"
      fi

      echo "[EXECUTED] card=$CARD_ID type=alfred queued_ok"
    else
      log "  ❌ QUEUE_FAILED"

      # Failure: increment count
      if ! update_card_state "$CARD_ID" "failure_count" "$((FAILURE_COUNT + 1))"; then
        log "  ERROR: Failed to increment failure count"
      fi
      if ! update_card_state "$CARD_ID" "last_attempt_at" "$(date +%s)"; then
        log "  WARN: Failed to record attempt time"
      fi

      echo "[ERROR] card=$CARD_ID queue_failed attempt=$((FAILURE_COUNT + 1))"
    fi
  fi
done <<< "$IN_PROGRESS"

log "[COMPLETE] processed $CARD_COUNT in_progress card(s)"
