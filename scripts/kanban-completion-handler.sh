#!/bin/bash
# kanban-completion-handler.sh — Auto-move completed cards
# Monitors in_progress cards for completion signals + moves to Done or Review
#
# Logic:
#   1. Check if card has execution comments (from Alfred/HAL)
#   2. Determine if card needs Joe review (check description keywords)
#   3. Move: no-review → Done, needs-review → Review
#
# Called by: cron every 30 min OR triggered by alfred-work-executor

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE="${SCRIPT_DIR%/scripts}"
TRACK_DIR="$WORKSPACE/.hal-alfred-tracking"
COMPLETION_LOG="$TRACK_DIR/kanban-completion.log"

mkdir -p "$TRACK_DIR"

ts() { date '+%Y-%m-%dT%H:%M:%S%z'; }
log() { echo "[$(ts)] $*" | tee -a "$COMPLETION_LOG"; }

# ── Helper: check if description indicates Joe review needed ──────────────────
needs_review() {
  local desc="$1"
  
  # Keywords that indicate Joe should review/decide
  if echo "$desc" | grep -iqE "joe|decision|choice|approve|direction|strategy|input|feedback|review|confirm"; then
    return 0  # true - needs review
  fi
  
  # Otherwise → safe to move to Done
  return 1  # false - no review needed
}

# ── Helper: check if card has completion marker ─────────────────────────────────
is_complete() {
  local card_id="$1"
  
  # Fetch card details
  local card=$(curl -s --max-time 10 "http://localhost:3001/api/kanban/${card_id}" 2>/dev/null || echo "{}")
  
  # Check for completion signals in comments or title
  local comments=$(echo "$card" | python3 -c "
import sys, json
d = json.load(sys.stdin)
comments = d.get('comments', [])
for c in comments:
  text = c.get('text', '').lower()
  if 'complete' in text or 'done' in text or 'finished' in text or 'result' in text:
    print(c.get('createdAt', '') + ' | ' + c.get('author', ''))
" 2>/dev/null | tail -1)
  
  [[ -n "$comments" ]]
}

# ── Main: process in_progress cards ──────────────────────────────────────────
main() {
  log "=== Kanban Completion Handler ==="
  
  # Fetch board
  local board=$(curl -s --max-time 10 "http://localhost:3001/api/kanban" 2>/dev/null || echo "{}")
  
  # Get in_progress cards
  local in_progress=$(echo "$board" | python3 -c "
import sys, json
cards = json.load(sys.stdin).get('columns', {}).get('in_progress', [])
for card in cards:
  print(json.dumps(card))
" 2>/dev/null || echo "")
  
  if [[ -z "$in_progress" ]]; then
    log "No in_progress cards"
    echo "[ACTION:SKIP] reason=no_in_progress"
    return 0
  fi
  
  local card_count=$(echo "$in_progress" | wc -l)
  local moved=0
  
  log "Checking $card_count in_progress card(s) for completion"
  
  # Process each in_progress card
  while IFS= read -r card_json; do
    [[ -z "$card_json" ]] && continue
    
    local card_id=$(echo "$card_json" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
    local title=$(echo "$card_json" | python3 -c "import sys,json; print(json.load(sys.stdin).get('title',''))" 2>/dev/null)
    local desc=$(echo "$card_json" | python3 -c "import sys,json; print(json.load(sys.stdin).get('description',''))" 2>/dev/null)
    local updated=$(echo "$card_json" | python3 -c "import sys,json; print(json.load(sys.stdin).get('updatedAt',''))" 2>/dev/null)
    
    [[ -z "$card_id" ]] && continue
    
    log "Checking: [$card_id] $title (updated $updated)"
    
    # Check if card is complete (has completion markers in comments)
    if is_complete "$card_id"; then
      log "  → Found completion signal"
      
      # Determine destination: Done or Review
      if needs_review "$desc"; then
        log "  → Needs review (moving to review)"
        local dest="review"
      else
        log "  → No review needed (moving to done)"
        local dest="done"
      fi
      
      # Move card
      local move_result=$(curl -s -X POST "http://localhost:3001/api/kanban/${card_id}/move" \
        -H "Content-Type: application/json" \
        -d "{\"toColumn\":\"${dest}\"}" \
        2>/dev/null | python3 -c "
import sys, json
try:
  r = json.load(sys.stdin)
  print(r.get('column', 'unknown'))
except:
  print('error')
" 2>/dev/null)
      
      if [[ "$move_result" == "$dest" ]]; then
        log "  ✓ Moved to $dest"
        moved=$((moved + 1))
      else
        log "  ✗ Move failed (got $move_result)"
      fi
    else
      log "  → No completion signal yet"
    fi
  done <<< "$in_progress"
  
  log "Completion handler: moved $moved/$card_count card(s)"
  echo "[ACTION:COMPLETE] moved=$moved total=$card_count"
}

main "$@"
