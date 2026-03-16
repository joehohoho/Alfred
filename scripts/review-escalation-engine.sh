#!/bin/bash
# review-escalation-engine.sh
# Auto-escalation + action layer for review bottlenecks
# Runs via cron every 30-60 min to reduce stall time
# Features:
#   1. Find review cards older than thresholds (24h warning, 72h critical, 7d auto-promote)
#   2. Send single digest notification with action buttons
#   3. Auto-promote aged cards to "blocked" lane with escalation comment
# Usage: review-escalation-engine.sh [--dry-run]

set -e

DRY_RUN="${1:-}"
TRACK_DIR="${HOME}/.openclaw/workspace/tracking"
LOG_FILE="${TRACK_DIR}/review-escalation.log"

# Thresholds (in hours)
WARN_THRESHOLD=24
CRITICAL_THRESHOLD=72
AUTO_PROMOTE_THRESHOLD=$((7 * 24))  # 7 days

mkdir -p "$TRACK_DIR"

log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# ─────────────────────────────────────────────────────────────────
# 1. Fetch board and identify stale review cards
# ─────────────────────────────────────────────────────────────────

log "Fetching kanban board..."
BOARD=$(curl -s --max-time 10 http://localhost:3001/api/kanban 2>/dev/null)

if [ -z "$BOARD" ]; then
  log "ERROR: Kanban API unreachable or returned empty response"
  log "  (Is the dashboard running? Try: launchctl start com.alfred.dashboard-nextjs)"
  exit 1
fi

# Validate JSON
if ! echo "$BOARD" | jq empty 2>/dev/null; then
  log "ERROR: Kanban API returned invalid JSON"
  exit 1
fi

# Parse review cards using Python
STALE_CARDS=$(echo "$BOARD" | python3 << 'PYEOF'
import json
import sys
from datetime import datetime, timezone, timedelta

board = json.load(sys.stdin)
review_cards = board.get('columns', {}).get('review', [])
now = datetime.now(timezone.utc)

stale = {
  'warning': [],      # 24-72h
  'critical': [],     # 72h-7d
  'auto_promote': []  # >7d
}

for card in review_cards:
    card_id = card.get('id')
    title = card.get('title', 'Untitled')
    updated = card.get('updatedAt', '')
    
    if not updated:
        continue
    
    try:
        dt = datetime.fromisoformat(updated.replace('Z', '+00:00'))
        age_hours = (now - dt).total_seconds() / 3600
        
        if age_hours >= (7 * 24):
            stale['auto_promote'].append({
                'id': card_id,
                'title': title,
                'age_hours': age_hours
            })
        elif age_hours >= 72:
            stale['critical'].append({
                'id': card_id,
                'title': title,
                'age_hours': age_hours
            })
        elif age_hours >= 24:
            stale['warning'].append({
                'id': card_id,
                'title': title,
                'age_hours': age_hours
            })
    except Exception as e:
        print(f'Error parsing {card_id}: {e}', file=sys.stderr)

print(json.dumps(stale))
PYEOF
)

echo "$STALE_CARDS" > "${TRACK_DIR}/stale-cards-$(date +'%s').json"

# ─────────────────────────────────────────────────────────────────
# 2. Auto-promote cards >7 days in review
# ─────────────────────────────────────────────────────────────────

AUTO_PROMOTE_COUNT=0
AUTO_PROMOTE_CARDS=$(echo "$STALE_CARDS" | jq -r '.auto_promote[] | @base64' 2>/dev/null || true)

if [ -n "$AUTO_PROMOTE_CARDS" ]; then
  log "Found $(echo "$STALE_CARDS" | jq '.auto_promote | length') cards >7 days in review — promoting to blocked..."
  
  for card_b64 in $AUTO_PROMOTE_CARDS; do
    card=$(echo "$card_b64" | base64 -d)
    card_id=$(echo "$card" | jq -r '.id')
    title=$(echo "$card" | jq -r '.title')
    age_days=$(($(echo "$card" | jq -r '.age_hours')/24))
    
    if [ "$DRY_RUN" != "--dry-run" ]; then
      # Move to blocked
      move_result=$(curl -s -X POST "http://localhost:3001/api/kanban/${card_id}/move" \
        -H "Content-Type: application/json" \
        -d '{"toColumn":"blocked"}' 2>/dev/null || echo "{}")
      
      # Post escalation comment
      comment_text="🚨 AUTO-ESCALATION: Stale in review for ${age_days}d. Promoting to blocked. Awaiting decision or rollback."
      curl -s -X POST "http://localhost:3001/api/kanban/${card_id}/comments" \
        -H "Content-Type: application/json" \
        -d "{\"author\":\"alfred\",\"text\":\"$comment_text\"}" 2>/dev/null || true
      
      log "✓ Promoted to blocked: $title (${age_days}d stale)"
      AUTO_PROMOTE_COUNT=$((AUTO_PROMOTE_COUNT + 1))
    else
      log "[DRY] Would promote to blocked: $title (${age_days}d stale)"
    fi
  done
fi

# ─────────────────────────────────────────────────────────────────
# 3. Send single digest notification for warning + critical cards
# ─────────────────────────────────────────────────────────────────

WARN_COUNT=$(echo "$STALE_CARDS" | jq '.warning | length')
CRIT_COUNT=$(echo "$STALE_CARDS" | jq '.critical | length')
TOTAL_ACTIONABLE=$((WARN_COUNT + CRIT_COUNT))

if [ "$TOTAL_ACTIONABLE" -gt 0 ]; then
  log "Sending digest notification: $WARN_COUNT warning, $CRIT_COUNT critical..."
  
  # Build digest message
  MSG="🔴 **Review Bottleneck Alert** ($TOTAL_ACTIONABLE cards waiting)\n\n"
  
  if [ "$CRIT_COUNT" -gt 0 ]; then
    MSG="${MSG}**🚨 CRITICAL (>72h):**\n"
    echo "$STALE_CARDS" | jq -r '.critical[] | "  • \(.title) — \(.age_hours | floor) hours"' >> /tmp/review-digest.txt || true
  fi
  
  if [ "$WARN_COUNT" -gt 0 ]; then
    MSG="${MSG}**⚠️  WARNING (24-72h):**\n"
    echo "$STALE_CARDS" | jq -r '.warning[] | "  • \(.title) — \(.age_hours | floor) hours"' >> /tmp/review-digest.txt || true
  fi
  
  MSG="${MSG}\n**Actions:** Review board at http://localhost:3001 or approve/defer from notification."
  
  if [ "$DRY_RUN" != "--dry-run" ]; then
    # Send via Command Center notification (see scripts/send-notification.sh pattern)
    bash "${HOME}/.openclaw/workspace/scripts/send-notification.sh" \
      "Review Bottleneck Alert" \
      "$MSG" \
      "urgent" || log "WARNING: Failed to send notification"
  else
    log "[DRY] Would send notification: $MSG"
  fi
fi

# ─────────────────────────────────────────────────────────────────
# 4. Summary log
# ─────────────────────────────────────────────────────────────────

log "Review escalation complete: promoted=$AUTO_PROMOTE_COUNT, warned=$WARN_COUNT, critical=$CRIT_COUNT"

# Optional: Write JSON summary for dashboard (if needed)
echo "$STALE_CARDS" | jq ". += {\"timestamp\": \"$(date -u +'%Y-%m-%dT%H:%M:%SZ')\", \"promoted\": $AUTO_PROMOTE_COUNT}" \
  > "${TRACK_DIR}/review-escalation-latest.json"

exit 0
