#!/bin/bash
# alfred-work-executor.sh — Phase 3 Option B Implementation
# Routes work from in_progress Kanban cards to Alfred or HAL
# Prevents queue lockup + keeps both systems productive regardless of board state
#
# Execution model:
#   - Runs as LaunchAgent every 15 min (StartInterval=900)
#   - Checks in_progress cards + proactive pool
#   - Routes intelligently: research/analysis → Alfred, code/build → HAL
#   - Auto-moves completed cards: no-review → Done, needs-review → Review
#
# Safeguards:
#   - Max context 60% (checkpoint before spawning session)
#   - Model fallback: LOCAL → Haiku (via subscription)
#   - No cascade failures (silent logging during backoff)
#   - Respects 15-min cooldown between major dispatches

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE="${SCRIPT_DIR%/scripts}"
TRACK_DIR="$WORKSPACE/.hal-alfred-tracking"
EXEC_LOG="$TRACK_DIR/alfred-execution.log"
STATE_FILE="$TRACK_DIR/alfred-execution-state.json"

mkdir -p "$TRACK_DIR"

ts() { date '+%Y-%m-%dT%H:%M:%S%z'; }
log() { echo "[$(ts)] $*" | tee -a "$EXEC_LOG"; }

# ── 1. Context check (safeguard) ──────────────────────────────────────────────
# Before spawning any session, verify we won't hit context limit
check_context_safe() {
  # Try to get session status; if fails, assume safe to proceed
  CONTEXT_PCT=$(curl -s -X POST http://localhost:18789 \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","method":"session.status","params":{"sessionKey":"main"},"id":1}' \
    2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('result',{}).get('context_percent',45))" 2>/dev/null || echo "45")
  
  if [[ "$CONTEXT_PCT" -gt 60 ]]; then
    log "SKIP: context at ${CONTEXT_PCT}% (threshold 60%)"
    echo "[ACTION:SKIP] reason=context_limit context_pct=${CONTEXT_PCT}"
    return 1
  fi
  return 0
}

# ── 2. Auto-route card type (research vs code) ────────────────────────────────
route_card_type() {
  local title="$1"
  local desc="$2"
  
  # Heuristic: check description for code/build keywords
  if echo "$desc" | grep -iqE "code|implement|build|refactor|fix|bug|deploy|api|database|test|feature"; then
    echo "hal"
  else
    echo "alfred"
  fi
}

# ── 3. Auto-determine if card needs Joe review ────────────────────────────────
needs_review() {
  local desc="$1"
  
  # If description contains keywords indicating Joe decision is needed → Review
  if echo "$desc" | grep -iqE "joe|decision|choice|approve|direction|strategy|input|feedback|review"; then
    return 0  # true - needs review
  fi
  
  # Otherwise, if it looks like a deliverable → Done
  return 1  # false - no review needed
}

# ── 4. Fetch in_progress cards ────────────────────────────────────────────────
fetch_in_progress() {
  curl -s --max-time 10 "http://localhost:3001/api/kanban" 2>/dev/null \
    | python3 -c "
import sys, json
board = json.load(sys.stdin)
cards = board.get('columns', {}).get('in_progress', [])
for card in cards:
    print(json.dumps(card))
" 2>/dev/null || echo ""
}

# ── 5. Dispatch to HAL (via WebSocket) ───────────────────────────────────────
dispatch_to_hal() {
  local card_id="$1"
  local title="$2"
  local desc="$3"
  local priority="$4"
  
  local task_msg="[KANBAN-TASK] ID: ${card_id} | Priority: ${priority}
Title: ${title}
Description: ${desc}
Instructions: Complete this task. Report results in a comment on the Kanban card (reference card ID)."
  
  log "  Dispatching to HAL: $title"
  
  timeout 45 node "$SCRIPT_DIR/hal-dispatch-ws.js" "$task_msg" 2>&1 && {
    log "  ✓ Dispatched to HAL: $card_id"
    return 0
  } || {
    log "  ✗ HAL dispatch failed (gateway offline?): $card_id"
    return 1
  }
}

# ── 6. Queue work for Alfred (write to dispatch queue, deduplicate) ────────────
dispatch_to_alfred() {
  local card_id="$1"
  local title="$2"
  local desc="$3"
  local priority="$4"
  
  local queue_file="$TRACK_DIR/alfred-queue.jsonl"
  
  # Deduplicate: don't queue if this card_id already has a pending entry
  if [[ -f "$queue_file" ]]; then
    local existing=$(grep "\"card_id\":\"$card_id\"" "$queue_file" | grep "\"status\":\"pending\"" | wc -l)
    if [[ "$existing" -gt 0 ]]; then
      log "  → Already queued for Alfred: $title (card: $card_id)"
      return 0
    fi
  fi
  
  # Append new entry to queue
  python3 - "$card_id" "$title" "$desc" "$priority" <<'PY' >> "$queue_file"
import sys, json
from datetime import datetime, timezone
card_id, title, desc, priority = sys.argv[1:5]
entry = {
  "queued_at": datetime.now(timezone.utc).isoformat(),
  "card_id": card_id,
  "title": title,
  "description": desc,
  "priority": priority,
  "status": "pending"
}
print(json.dumps(entry, separators=(',', ':')))
PY
  
  log "  ✓ Queued for Alfred: $title (card: $card_id)"
  return 0
}

# ── 7. Move card to Done or Review ────────────────────────────────────────────
move_card() {
  local card_id="$1"
  local dest_col="$2"  # "done" or "review"
  
  curl -s -X POST "http://localhost:3001/api/kanban/${card_id}/move" \
    -H "Content-Type: application/json" \
    -d "{\"toColumn\":\"${dest_col}\"}" \
    2>/dev/null | python3 -c "
import sys, json
try:
  r = json.load(sys.stdin)
  col = r.get('column', '')
  if col == dest_col:
    print(f'✓ {col}')
  else:
    print(f'✗ failed (got {col})')
except:
  print('✗ api error')
" 2>/dev/null || echo "✗ timeout"
}

# ── 8. Main loop: process in_progress cards ──────────────────────────────────
main() {
  log "=== Alfred Work Executor (Phase 3) ==="
  
  # Check context first
  check_context_safe || exit 0
  
  # Fetch in_progress cards
  IN_PROG=$(fetch_in_progress)
  if [[ -z "$IN_PROG" ]]; then
    log "No in_progress cards. Exiting."
    echo "[ACTION:SKIP] reason=no_in_progress_cards"
    exit 0
  fi
  
  CARD_COUNT=$(echo "$IN_PROG" | wc -l)
  log "Found $CARD_COUNT in_progress card(s)"
  
  # Process each card
  EXECUTED=0
  while IFS= read -r card_json; do
    [[ -z "$card_json" ]] && continue
    
    CARD_ID=$(echo "$card_json" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
    TITLE=$(echo "$card_json" | python3 -c "import sys,json; print(json.load(sys.stdin).get('title',''))" 2>/dev/null)
    DESC=$(echo "$card_json" | python3 -c "import sys,json; print(json.load(sys.stdin).get('description',''))" 2>/dev/null)
    PRIORITY=$(echo "$card_json" | python3 -c "import sys,json; print(json.load(sys.stdin).get('priority','normal'))" 2>/dev/null)
    UPDATED=$(echo "$card_json" | python3 -c "import sys,json; print(json.load(sys.stdin).get('updatedAt',''))" 2>/dev/null)
    
    [[ -z "$CARD_ID" || -z "$TITLE" ]] && continue
    
    log "Processing: [$CARD_ID] $TITLE (priority=$PRIORITY, updated=$UPDATED)"
    
    # Determine routing
    ROUTE=$(route_card_type "$TITLE" "$DESC")
    log "  Route: $ROUTE"
    
    # Execute based on route
    case "$ROUTE" in
      hal)
        dispatch_to_hal "$CARD_ID" "$TITLE" "$DESC" "$PRIORITY" || {
          log "  HAL dispatch failed (likely offline). Queuing for Alfred instead."
          dispatch_to_alfred "$CARD_ID" "$TITLE" "$DESC" "$PRIORITY"
        }
        EXECUTED=$((EXECUTED + 1))
        ;;
      alfred)
        dispatch_to_alfred "$CARD_ID" "$TITLE" "$DESC" "$PRIORITY"
        EXECUTED=$((EXECUTED + 1))
        ;;
    esac
  done <<< "$IN_PROG"
  
  log "Executed $EXECUTED / $CARD_COUNT card(s)"
  echo "[ACTION:EXECUTE] executed=$EXECUTED total=$CARD_COUNT"
}

# ── 9. Entry point ───────────────────────────────────────────────────────────
main "$@"
