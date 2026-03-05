#!/bin/bash
# hal-lease-monitor-enhanced.sh - Monitor and auto-clear stale in_progress cards
# Enhanced version with better detection, token awareness, and safe auto-unblock
# Usage: hal-lease-monitor-enhanced.sh [--check-only] [--max-age-minutes 120] [--force]

set -euo pipefail

DASHBOARD_API="http://localhost:3001/api"
MAX_AGE_MINUTES=${2:-120}  # Default 2 hours
CHECK_ONLY="${1:-}"
FORCE_UNBLOCK="${3:-}"
LOG_FILE="/Users/hopenclaw/.openclaw/workspace/logs/hal-lease-monitor.log"

mkdir -p "$(dirname "$LOG_FILE")"

ts() { date '+%Y-%m-%dT%H:%M:%S'; }
log() { echo "[$(ts)] $*" | tee -a "$LOG_FILE"; }

get_context_usage() {
  curl -s "${DASHBOARD_API}/status" 2>/dev/null \
    | jq -r '.context_usage_pct // 50' 2>/dev/null || echo "50"
}

can_unblock() {
  local context=$(get_context_usage)
  
  # If context is too high, don't auto-unblock (might make it worse)
  if [[ $context -gt 80 ]]; then
    return 1
  fi
  
  return 0
}

# Fetch all in_progress cards from kanban API
fetch_in_progress() {
  curl -s "${DASHBOARD_API}/kanban?column=in_progress" 2>/dev/null || echo "[]"
}

# Check if a card is truly stalled (no activity in logs)
is_stalled() {
  local card_id="$1"
  local max_age_seconds=$((MAX_AGE_MINUTES * 60))
  
  # Fetch card details
  local card=$(curl -s "${DASHBOARD_API}/kanban/${card_id}" 2>/dev/null || echo "{}")
  
  if [[ "$card" == "{}" ]] || [[ -z "$card" ]]; then
    return 1  # API error, assume not stalled
  fi
  
  local updated_at=$(echo "$card" | jq -r '.updatedAt // ""' 2>/dev/null || echo "")
  
  if [[ -z "$updated_at" ]]; then
    return 1  # No timestamp, can't determine
  fi
  
  # Parse timestamp and calculate age
  local updated_epoch=$(python3 -c "
import datetime
dt_str = '${updated_at:0:19}'
try:
  dt = datetime.datetime.fromisoformat(dt_str)
  print(int(dt.timestamp()))
except:
  print(0)
" 2>/dev/null || echo "0")
  
  local now_epoch=$(date +%s)
  local age_seconds=$((now_epoch - updated_epoch))
  
  if [[ $age_seconds -gt $max_age_seconds ]]; then
    return 0  # Stalled
  fi
  
  return 1  # Active
}

main() {
  log "=== Lease Monitor (Enhanced) ==="
  
  # Fetch in_progress cards
  IN_PROGRESS=$(fetch_in_progress)
  
  if [[ "$IN_PROGRESS" == "[]" ]] || [[ -z "$IN_PROGRESS" ]]; then
    log "✅ No in_progress cards"
    return 0
  fi
  
  local stalled_count=0
  local active_count=0
  
  # Process each card
  echo "$IN_PROGRESS" | jq -r '.[] | "\(.id)|\(.title)|\(.updatedAt)"' 2>/dev/null | while IFS='|' read -r card_id title updated_at; do
    if is_stalled "$card_id"; then
      # Calculate exact age
      local updated_epoch=$(python3 -c "
import datetime
dt_str = '${updated_at:0:19}'
try:
  dt = datetime.datetime.fromisoformat(dt_str)
  print(int(dt.timestamp()))
except:
  print(0)
" 2>/dev/null || echo "0")
      
      local now_epoch=$(date +%s)
      local age_minutes=$(( (now_epoch - updated_epoch) / 60 ))
      
      log "⚠️  STALLED: $title (age: ${age_minutes}m, threshold: ${MAX_AGE_MINUTES}m)"
      
      stalled_count=$((stalled_count + 1))
      
      # Decide whether to auto-unblock
      if [[ -n "$FORCE_UNBLOCK" ]] || (can_unblock && [[ -z "$CHECK_ONLY" ]]); then
        # Generate audit comment
        local audit_msg="[AUTO-UNBLOCK] Stale in_progress for ${age_minutes}m (threshold: ${MAX_AGE_MINUTES}m). Moved to blocked by lease-monitor at $(ts). Manual triage required."
        
        # Add comment
        curl -s -X POST "${DASHBOARD_API}/kanban/${card_id}/comments" \
          -H "Content-Type: application/json" \
          -d "{\"author\":\"alfred\",\"text\":\"$audit_msg\"}" >/dev/null 2>&1 || true
        
        # Move to blocked column
        curl -s -X PATCH "${DASHBOARD_API}/kanban/${card_id}" \
          -H "Content-Type: application/json" \
          -d '{"column":"blocked"}' >/dev/null 2>&1 || true
        
        log "  → Moved to blocked (context-aware unblock)"
      elif [[ -n "$CHECK_ONLY" ]]; then
        log "  → [CHECK-ONLY] Would move to blocked"
      else
        log "  → Skipped (context too high for auto-unblock)"
      fi
    else
      # Card is active
      local updated_epoch=$(python3 -c "
import datetime
dt_str = '${updated_at:0:19}'
try:
  dt = datetime.datetime.fromisoformat(dt_str)
  print(int(dt.timestamp()))
except:
  print(0)
" 2>/dev/null || echo "0")
      
      local now_epoch=$(date +%s)
      local age_minutes=$(( (now_epoch - updated_epoch) / 60 ))
      
      log "✅ Active: $title (age: ${age_minutes}m)"
      active_count=$((active_count + 1))
    fi
  done
  
  log "📊 Summary: $active_count active, $stalled_count stalled"
  log "✅ Lease check complete"
}

main "$@"
