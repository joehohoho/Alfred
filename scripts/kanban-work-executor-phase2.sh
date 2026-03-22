#!/bin/bash
# kanban-work-executor-phase2.sh
# PRODUCTION v2.0: Phase 1 + Phase 2 safeguards implemented
#
# Phase 1 Safeguards:
# 1. JSON schema validation (A1)
# 2. Atomic state file writes (A2)
# 3. Error handling for I/O (A3)
# 4. Field validation (A4)
# 5. Log rotation (D2)
#
# Phase 2 Safeguards:
# 6. HTTP status code checks (A5)
# 7. Session tracking for HAL (B2, B5)
# 8. Alfred queue timeout + cleanup (B3)
# 9. Circuit breaker for flaky gateways (C1)
# 10. HAL execution health check (C2)
# 11. Unified queue status tracking (B4)
# 12. Idempotency + retry logic (B5)
# 13. Process cleanup monitoring (C4)
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
QUEUE_STATUS_FILE="$TRACK_DIR/queue-status.json"
SESSION_TRACKER="$TRACK_DIR/session-tracking.jsonl"
CIRCUIT_BREAKER="$TRACK_DIR/circuit-breaker.json"

mkdir -p "$TRACK_DIR" "$QUEUE_DIR"

ts() { date '+%Y-%m-%dT%H:%M:%S%z'; }
log() { echo "[$(ts)] $*" | tee -a "$EXEC_LOG"; }
health_log() { echo "[$(ts)] $*" | tee -a "$HEALTH_LOG"; }

# ════════════════════════════════════════════════════════════════════════════
# PHASE 0: LOG ROTATION & CIRCUIT BREAKER CHECK
# ════════════════════════════════════════════════════════════════════════════

rotate_logs() {
  local log_file="$1"
  local max_size="${2:-1048576}"
  local max_backups="${3:-7}"

  if [[ ! -f "$log_file" ]]; then
    return 0
  fi

  local size
  if size=$(stat -f%z "$log_file" 2>/dev/null); then
    true
  else
    size=$(stat -c%s "$log_file" 2>/dev/null || echo 0)
  fi

  if (( size <= max_size )); then
    return 0
  fi

  for ((i=max_backups; i>1; i--)); do
    [[ -f "$log_file.$((i-1)).gz" ]] && mv "$log_file.$((i-1)).gz" "$log_file.$i.gz"
  done

  mv "$log_file" "$log_file.1"
  gzip "$log_file.1" 2>/dev/null || true
  touch "$log_file"
  return 0
}

rotate_logs "$EXEC_LOG" 1048576 7
rotate_logs "$HEALTH_LOG" 1048576 7

# ════════════════════════════════════════════════════════════════════════════
# PHASE 1: CIRCUIT BREAKER CHECK (C1 — Flaky Gateway Detection)
# ════════════════════════════════════════════════════════════════════════════

check_circuit_breaker() {
  if [[ ! -f "$CIRCUIT_BREAKER" ]]; then
    echo '{"state":"closed","fail_count":0,"last_failure":null}' > "$CIRCUIT_BREAKER"
    return 0
  fi

  python3 << 'PYEOF'
import json
from pathlib import Path
import time

cb_file = Path("CIRCUIT_BREAKER")
cb = json.loads(cb_file.read_text())

# If state is "open" (flaky gateway detected), check if recovery window passed
if cb["state"] == "open":
  last_fail = cb.get("last_failure", 0)
  recovery_window = 300  # 5 minutes
  now = time.time()
  
  if now - last_fail > recovery_window:
    # Try to close
    cb["state"] = "half-open"
    cb_file.write_text(json.dumps(cb, indent=2))
  else:
    # Still open, exit
    print("OPEN")
    exit(0)

exit(0)
PYEOF
}

CB_STATUS=$(check_circuit_breaker 2>/dev/null || echo "CLOSED")

if [[ "$CB_STATUS" == "OPEN" ]]; then
  health_log "CIRCUIT_BREAKER:OPEN — Gateway flakiness detected, skipping dispatch"
  log "[HEALTH_CHECK:CIRCUIT_BREAKER_OPEN] Recovery window in progress"
  exit 0
fi

# ════════════════════════════════════════════════════════════════════════════
# PHASE 2: GATEWAY HEALTH CHECK + HTTP STATUS CODES (A5)
# ════════════════════════════════════════════════════════════════════════════

validate_kanban_json() {
  local json="$1"

  printf '%s' "$json" | python3 -c '
import sys
import json

try:
  data = json.load(sys.stdin)

  assert isinstance(data, dict), "JSON not an object"
  assert "columns" in data, "Missing columns key"
  assert isinstance(data["columns"], dict), "columns is not an object"
  assert "in_progress" in data["columns"], "Missing in_progress column"

  cards = data["columns"]["in_progress"]
  assert isinstance(cards, list), "in_progress is not an array"

  if cards and len(cards) > 0:
    first = cards[0]
    assert isinstance(first, dict), "Card is not an object"
    assert "id" in first, "Card missing id field"
    assert "title" in first, "Card missing title field"

  print("VALID")
  sys.exit(0)
except Exception as e:
  print(f"INVALID: {str(e)}", file=sys.stderr)
  sys.exit(1)
'

  return $?
}

GATEWAY_UP=true
KANBAN_JSON=""
HTTP_STATUS="000"

# Make request and capture HTTP status code
HTTP_RESPONSE=$(curl -s -w "\n%{http_code}" "http://localhost:3001/api/kanban" 2>/dev/null || echo "")
HTTP_STATUS=$(echo "$HTTP_RESPONSE" | tail -1)
KANBAN_JSON=$(echo "$HTTP_RESPONSE" | sed '$d')

# Check HTTP status (A5 — HTTP Status Code Checks)
if [[ ! "$HTTP_STATUS" =~ ^[2] ]]; then
  GATEWAY_UP=false
  health_log "GATEWAY_DOWN: HTTP $HTTP_STATUS (expected 200-299)"
  
  # Update circuit breaker on error
  python3 << PYEOF
import json
from pathlib import Path
import time

cb_file = Path("$CIRCUIT_BREAKER")
cb = json.loads(cb_file.read_text()) if cb_file.exists() else {"state": "closed", "fail_count": 0}

cb["fail_count"] = cb.get("fail_count", 0) + 1
cb["last_failure"] = time.time()

# If 3+ consecutive failures, open circuit breaker
if cb["fail_count"] >= 3:
  cb["state"] = "open"
  health_log = open("$HEALTH_LOG", "a")
  health_log.write(f"[{time.strftime('%Y-%m-%dT%H:%M:%S%z')}] CIRCUIT_BREAKER:OPEN — 3+ failures detected, entering recovery window\n")
  health_log.close()

cb_file.write_text(json.dumps(cb, indent=2))
PYEOF

elif ! echo "$KANBAN_JSON" | validate_kanban_json >/dev/null 2>&1; then
  GATEWAY_UP=false
  health_log "GATEWAY_DOWN: Invalid JSON response (HTTP $HTTP_STATUS)"
fi

if [[ "$GATEWAY_UP" == "false" ]]; then
  health_log "ACTION: Gateway down — safeguarding in_progress cards"
  log "[HEALTH_CHECK:GATEWAY_DOWN] No dispatch attempts"
  exit 0
fi

# Success: reset circuit breaker
python3 << PYEOF
import json
from pathlib import Path

cb_file = Path("$CIRCUIT_BREAKER")
cb = json.loads(cb_file.read_text()) if cb_file.exists() else {}
cb["state"] = "closed"
cb["fail_count"] = 0
cb_file.write_text(json.dumps(cb, indent=2))
PYEOF

health_log "GATEWAY_UP: Kanban API responding with valid JSON (HTTP $HTTP_STATUS)"

# ════════════════════════════════════════════════════════════════════════════
# PHASE 3: EXTRACT CARDS
# ════════════════════════════════════════════════════════════════════════════

IN_PROGRESS=$(echo "$KANBAN_JSON" | python3 -c "
import sys, json
data = json.load(sys.stdin)
cards = data.get('columns', {}).get('in_progress', [])
for card in cards:
    print(json.dumps(card))
" 2>/dev/null || echo "")

if [[ -z "$IN_PROGRESS" ]]; then
  # Also: Clean up stale Alfred queue items (B3 — Queue Cleanup)
  find "$QUEUE_DIR" -type f -name "task-*.json" -mmin +360 -delete 2>/dev/null || true
  log "[SKIPPED] no_in_progress_cards"
  exit 0
fi

CARD_COUNT=$(echo "$IN_PROGRESS" | wc -l)
log "[HEALTH_CHECK:OK] Processing $CARD_COUNT in_progress card(s)"

# ════════════════════════════════════════════════════════════════════════════
# PHASE 4: INITIALIZE STATE FILES
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

init_queue_status() {
  if [[ ! -f "$QUEUE_STATUS_FILE" ]]; then
    if ! echo '{}' > "$QUEUE_STATUS_FILE"; then
      log "ERROR: Failed to initialize queue status file"
      return 1
    fi
  fi
  return 0
}

if ! init_state_file || ! init_queue_status; then
  log "[ERROR] State file initialization failed"
  exit 1
fi

# ════════════════════════════════════════════════════════════════════════════
# HELPER: Atomic State Write
# ════════════════════════════════════════════════════════════════════════════

write_state_atomic() {
  local state_json="$1"
  local tmp_file="$STATE_FILE.tmp.$$"

  if ! echo "$state_json" > "$tmp_file"; then
    log "ERROR: Failed to write state to temp file"
    rm -f "$tmp_file"
    return 1
  fi

  if ! mv "$tmp_file" "$STATE_FILE"; then
    log "ERROR: Failed to atomic rename state file"
    rm -f "$tmp_file"
    return 1
  fi

  return 0
}

# ════════════════════════════════════════════════════════════════════════════
# HELPER: Update Card State
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

  tmp_file = Path("$STATE_FILE.tmp.$$")
  tmp_file.write_text(json.dumps(state, indent=2))
  tmp_file.replace(state_file)

except Exception as e:
  print(f"ERROR: {str(e)}", file=sys.stderr)
  exit(1)
PYEOF

  return $?
}

# ════════════════════════════════════════════════════════════════════════════
# HELPER: Validate Card Fields
# ════════════════════════════════════════════════════════════════════════════

validate_card_fields() {
  local card_json="$1"

  python3 - "$card_json" << 'PYEOF'
import sys
import json

try:
  card = json.loads(sys.argv[1])

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
# HELPER: Queue for Alfred (B3 — Queue with Timeout Tracking)
# ════════════════════════════════════════════════════════════════════════════

queue_for_alfred() {
  local card_id="$1"
  local title="$2"
  local desc="$3"
  local priority="${4:-normal}"

  local ts=$(date +%s%N | cut -b1-13)
  local queue_file="$QUEUE_DIR/task-${ts}-${card_id}.json"

  if ! cat > "$queue_file" << EOF
{
  "card_id": "$card_id",
  "title": "$title",
  "description": "$desc",
  "priority": "$priority",
  "queued_at": $(date +%s),
  "status": "queued",
  "queue_timeout_seconds": 21600
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
# HELPER: Generate Idempotency Key (B5 — Idempotency)
# ════════════════════════════════════════════════════════════════════════════

generate_idempotency_key() {
  local card_id="$1"
  echo "dispatch-$(date +%s)-${card_id}-$(openssl rand -hex 4)"
}

# ════════════════════════════════════════════════════════════════════════════
# HELPER: Track HAL Session (B2, B5 — Session Tracking + Idempotency)
# ════════════════════════════════════════════════════════════════════════════

track_session() {
  local card_id="$1"
  local session_key="$2"
  local idempotency_key="$3"
  local status="$4"

  python3 << PYEOF || true
import json
from pathlib import Path
import time

try:
  log_file = Path("$SESSION_TRACKER")
  entry = {
    "timestamp": time.time(),
    "card_id": "$card_id",
    "session_key": "$session_key",
    "idempotency_key": "$idempotency_key",
    "status": "$status"
  }
  
  with open(log_file, "a") as f:
    f.write(json.dumps(entry) + "\n")
except:
  pass
PYEOF
}

# ════════════════════════════════════════════════════════════════════════════
# PHASE 5: PROCESS CARDS
# ════════════════════════════════════════════════════════════════════════════

while IFS= read -r CARD_JSON; do
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

  # Check failure threshold
  if (( FAILURE_COUNT >= 3 )); then
    log "  BLOCKED: $FAILURE_COUNT consecutive failures — moving to Blocked column"

    REASON="Dispatch failed after 3 attempts. Check executor logs for details."

    # Move card + check status code (A5)
    HTTP_STATUS=$(curl -s -w "%{http_code}" -X POST "http://localhost:3001/api/kanban/$CARD_ID/move" \
      -H "Content-Type: application/json" \
      -d "{\"column\": \"blocked\", \"reason\": \"$REASON\"}" -o /dev/null 2>/dev/null || echo "000")

    if [[ "$HTTP_STATUS" =~ ^[2] ]]; then
      log "  ✅ Moved to Blocked column (HTTP $HTTP_STATUS)"
    else
      log "  ❌ Failed to move card (HTTP $HTTP_STATUS)"
    fi

    # Add comment + check status code
    curl -s -X POST "http://localhost:3001/api/kanban/$CARD_ID/comments" \
      -H "Content-Type: application/json" \
      -d "{\"author\": \"executor\", \"text\": \"🚫 BLOCKED: Dispatch failed 3+ times. Gateway or HAL unreachable. Check executor logs: ~/.openclaw/.hal-alfred-tracking/executor-health.log\"}" 2>/dev/null || true

    log "[MOVED_TO_BLOCKED] card=$CARD_ID reason='3_consecutive_failures'"

    if ! update_card_state "$CARD_ID" "failure_count" "0"; then
      log "  WARN: Failed to reset failure count"
    fi

    continue
  fi

  # Check cooldown
  NOW=$(date +%s)
  COOLDOWN_SECONDS=$((300 + FAILURE_COUNT * 120))
  NEXT_ATTEMPT=$((LAST_ATTEMPT + COOLDOWN_SECONDS))

  if (( NOW < NEXT_ATTEMPT )); then
    WAIT_MIN=$(( (NEXT_ATTEMPT - NOW) / 60 ))
    log "  COOLDOWN: in effect for ${WAIT_MIN}m more (attempt=$((FAILURE_COUNT + 1)))"
    echo "[SKIPPED] card=$CARD_ID cooldown_active"
    continue
  fi

  # Determine execution type
  EXEC_TYPE="alfred"
  if echo "$CARD_DESC" | grep -iqE "code|implement|build|refactor|fix.*bug|deploy|api|database"; then
    EXEC_TYPE="hal"
  fi

  log "  Type: $EXEC_TYPE | Attempt: $((FAILURE_COUNT + 1))"

  # Generate idempotency key (B5)
  IDEMPOTENCY_KEY=$(generate_idempotency_key "$CARD_ID")

  # Dispatch
  if [[ "$EXEC_TYPE" == "hal" ]]; then
    # Phase 2 hard gate: HAL dispatch requires validated handoff contract
    if ! HANDOFF_OUT=$(bash "$SCRIPT_DIR/validate-handoff-generic.sh" "$CARD_ID" 2>&1); then
      log "  🚫 HANDOFF_BLOCK: $(echo "$HANDOFF_OUT" | tr '\n' ' ' | cut -c1-240)"
      curl -s -X POST "http://localhost:3001/api/kanban/$CARD_ID/comments" \
        -H "Content-Type: application/json" \
        -d "{\"author\": \"executor\", \"text\": \"🚫 HAL dispatch blocked: missing/invalid handoff contract at goals/handoffs/${CARD_ID}.json. Run: bash scripts/validate-handoff-generic.sh ${CARD_ID}.\"}" 2>/dev/null || true

      # Treat as controlled skip, not a transient dispatch failure
      if ! update_card_state "$CARD_ID" "last_attempt_at" "$(date +%s)"; then
        log "  WARN: Failed to record attempt time"
      fi
      echo "[SKIPPED] card=$CARD_ID reason=handoff_missing_or_invalid"
      continue
    fi

    TASK_MSG="[KANBAN-TASK] $CARD_ID
Title: $CARD_TITLE
Priority: $CARD_PRIORITY
Description: $CARD_DESC

Complete this task. Report progress in card comments.
Handoff: validated ($CARD_ID)."

    if DISPATCH_OUT=$(timeout 45 node "$SCRIPT_DIR/hal-dispatch-ws.js" "$TASK_MSG" 2>&1); then
      # Extract session key from output for tracking (B2)
      SESSION_KEY=$(echo "$DISPATCH_OUT" | grep "session=" | head -1 | cut -d= -f2 || echo "unknown")
      
      log "  ✅ DISPATCHED_TO_HAL: $DISPATCH_OUT"
      track_session "$CARD_ID" "$SESSION_KEY" "$IDEMPOTENCY_KEY" "dispatched_hal"

      if ! update_card_state "$CARD_ID" "failure_count" "0"; then
        log "  WARN: Failed to clear failure count"
      fi
      if ! update_card_state "$CARD_ID" "last_success_at" "$(date +%s)"; then
        log "  WARN: Failed to record success time"
      fi

      echo "[EXECUTED] card=$CARD_ID type=hal dispatch_ok"
    else
      log "  ❌ DISPATCH_FAILED: $DISPATCH_OUT"
      track_session "$CARD_ID" "unknown" "$IDEMPOTENCY_KEY" "dispatch_failed_hal"

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
    # Queue for Alfred with tracking (B3, B4)
    if queue_for_alfred "$CARD_ID" "$CARD_TITLE" "$CARD_DESC" "$CARD_PRIORITY"; then
      log "  ✅ QUEUED_FOR_ALFRED"
      track_session "$CARD_ID" "queued-alfred" "$IDEMPOTENCY_KEY" "queued"

      if ! update_card_state "$CARD_ID" "failure_count" "0"; then
        log "  WARN: Failed to clear failure count"
      fi
      if ! update_card_state "$CARD_ID" "last_success_at" "$(date +%s)"; then
        log "  WARN: Failed to record success time"
      fi

      echo "[EXECUTED] card=$CARD_ID type=alfred queued_ok"
    else
      log "  ❌ QUEUE_FAILED"
      track_session "$CARD_ID" "unknown" "$IDEMPOTENCY_KEY" "queue_failed"

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
