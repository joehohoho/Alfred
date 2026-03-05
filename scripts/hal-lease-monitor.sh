#!/bin/bash
# hal-lease-monitor.sh - Monitor and auto-clear stale in_progress cards blocking HAL
# Usage: hal-lease-monitor.sh [--check-only] [--max-age-minutes 120]

set -euo pipefail

DASHBOARD_API="http://localhost:3001/api"
MAX_AGE_MINUTES=${2:-120}  # Default 2 hours
CHECK_ONLY=${1:-}

# Fetch all in_progress cards
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Checking for stale in_progress cards..."
IN_PROGRESS=$(curl -s "${DASHBOARD_API}/kanban?column=in_progress" 2>/dev/null || echo "[]")

if [[ "$IN_PROGRESS" == "[]" ]] || [[ -z "$IN_PROGRESS" ]]; then
  echo "✅ No in_progress cards blocking HAL"
  exit 0
fi

# Parse each card
echo "$IN_PROGRESS" | jq -r '.[] | "\(.id)|\(.title)|\(.updatedAt)"' | while IFS='|' read -r card_id title updated_at; do
  # Calculate age in minutes
  # Use Python for reliable date parsing (handles both macOS and Linux)
  updated_epoch=$(python3 -c "
import datetime
dt_str = '${updated_at:0:19}'
dt = datetime.datetime.fromisoformat(dt_str)
print(int(dt.timestamp()))
" 2>/dev/null || echo "0")
  
  now_epoch=$(date +%s)
  age_minutes=$(( (now_epoch - updated_epoch) / 60 ))
  
  if [[ $age_minutes -gt $MAX_AGE_MINUTES ]]; then
    echo "⚠️  STALE: $title (age: ${age_minutes}m, max: ${MAX_AGE_MINUTES}m)"
    
    if [[ -z "$CHECK_ONLY" ]]; then
      # Move to review with audit note
      AUDIT_MSG="[AUTO-UNBLOCK] Stale in_progress for ${age_minutes}m (threshold: ${MAX_AGE_MINUTES}m). Moved to review by hal-lease-monitor at $(date '+%Y-%m-%d %H:%M:%S'). Manual triage required."
      
      curl -s -X POST "${DASHBOARD_API}/kanban/${card_id}/comments" \
        -H "Content-Type: application/json" \
        -d "{\"author\":\"alfred\",\"text\":\"$AUDIT_MSG\"}" >/dev/null
      
      curl -s -X PATCH "${DASHBOARD_API}/kanban/${card_id}" \
        -H "Content-Type: application/json" \
        -d '{"column":"review"}' >/dev/null
      
      echo "  → Moved to review (audit logged)"
    else
      echo "  → [CHECK-ONLY] Would move to review"
    fi
  else
    echo "✅ Active: $title (age: ${age_minutes}m)"
  fi
done

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Lease check complete"
