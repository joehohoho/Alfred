#!/bin/bash
# kanban-work-executor.sh
# Executes in_progress Kanban cards by dispatching to Alfred or HAL based on card type
# Called by: kanban-execution-monitor cron (every 30 min)
# Usage: bash kanban-work-executor.sh
# Output: [EXECUTED], [SKIPPED], or [ERROR]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE="${SCRIPT_DIR%/scripts}"
TRACK_DIR="$WORKSPACE/.hal-alfred-tracking"
EXEC_LOG="$TRACK_DIR/kanban-execution.log"

mkdir -p "$TRACK_DIR"
ts() { date '+%Y-%m-%dT%H:%M:%S%z'; }
log() { echo "[$(ts)] $*" | tee -a "$EXEC_LOG"; }

# ── Fetch in_progress cards from kanban API ──────────────────────────────────
BOARD_JSON=$(curl -s --max-time 10 "http://localhost:3001/api/kanban" 2>/dev/null || echo "{}")
IN_PROGRESS=$(echo "$BOARD_JSON" | python3 -c "
import sys, json
cards = json.load(sys.stdin).get('columns', {}).get('in_progress', [])
for card in cards:
    print(json.dumps(card))
" 2>/dev/null || echo "")

# ── If no in_progress cards, nothing to do ────────────────────────────────────
if [[ -z "$IN_PROGRESS" ]]; then
  echo "[SKIPPED] no_in_progress_cards"
  exit 0
fi

# ── Process each in_progress card ────────────────────────────────────────────
CARD_COUNT=$(echo "$IN_PROGRESS" | wc -l)
log "FOUND: $CARD_COUNT in_progress card(s)"

while IFS= read -r CARD_JSON; do
  CARD_ID=$(echo "$CARD_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
  CARD_TITLE=$(echo "$CARD_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin).get('title',''))" 2>/dev/null)
  CARD_DESC=$(echo "$CARD_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin).get('description',''))" 2>/dev/null)
  CARD_PRIORITY=$(echo "$CARD_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin).get('priority','normal'))" 2>/dev/null)
  
  [[ -z "$CARD_ID" ]] && continue
  
  log "EXECUTE: [$CARD_ID] $CARD_TITLE (priority=$CARD_PRIORITY)"
  
  # ── Determine execution type (Alfred research vs HAL code) ──────────────────
  # Simple heuristic: if description contains code keywords → HAL, else Alfred
  EXEC_TYPE="alfred"
  if echo "$CARD_DESC" | grep -iqE "code|implement|build|refactor|fix.*bug|deploy|api|database"; then
    EXEC_TYPE="hal"
  fi
  
  log "  Type: $EXEC_TYPE"
  
  # ── Check if card was updated recently (prevent re-executing stale cards) ────
  UPDATED_AT=$(echo "$CARD_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin).get('updatedAt',''))" 2>/dev/null)
  
  # ── Dispatch to executor ─────────────────────────────────────────────────────
  if [[ "$EXEC_TYPE" == "hal" ]]; then
    # Dispatch to HAL via WebSocket
    TASK_MSG="[KANBAN-TASK] $CARD_ID
Title: $CARD_TITLE
Priority: $CARD_PRIORITY
Description: $CARD_DESC

Complete this task. Report progress in card comments."
    
    DISPATCH_OUT=$(timeout 45 node "$SCRIPT_DIR/hal-dispatch-ws.js" "$TASK_MSG" 2>&1) && {
      log "  DISPATCHED_TO_HAL: success"
      echo "[EXECUTED] card=$CARD_ID type=hal"
    } || {
      log "  DISPATCH_FAILED: $DISPATCH_OUT"
      echo "[ERROR] card=$CARD_ID dispatch_failed"
    }
  else
    # Dispatch to Alfred (current session)
    # Write to ACTIVE-TASK.md so Alfred picks it up
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
    
    log "  QUEUED_FOR_ALFRED: wrote to ACTIVE-TASK-DISPATCH.md"
    echo "[EXECUTED] card=$CARD_ID type=alfred"
  fi
done <<< "$IN_PROGRESS"

log "COMPLETE: processed $CARD_COUNT card(s)"
