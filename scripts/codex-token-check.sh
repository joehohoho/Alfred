#!/bin/bash
# codex-token-check.sh
# Monitors Codex OAuth token expiry and alerts when refresh is needed
# Integrated with session-cleanup.sh (runs every 30 min)

set -euo pipefail

LOG="$HOME/.openclaw/logs/codex-token-check.log"
TOKENS_DIR="$HOME/.openclaw/tokens"
NOTIFICATION_URL="http://localhost:3001/api/notifications"

ts() { date '+%Y-%m-%dT%H:%M:%S'; }
log() { echo "[$(ts)] $*" >> "$LOG"; }

# Find Codex token file
CODEX_TOKEN_FILE=$(find "$TOKENS_DIR" -name "*codex*" -o -name "*openai*" 2>/dev/null | head -1)

if [[ ! -f "$CODEX_TOKEN_FILE" ]]; then
  log "ERROR: Codex token file not found"
  exit 1
fi

# Parse expiry time from token metadata (if available)
if [[ -f "${CODEX_TOKEN_FILE}.meta" ]]; then
  EXPIRES=$(python3 -c "import json; print(json.load(open('${CODEX_TOKEN_FILE}.meta')).get('expires_at','unknown'))" 2>/dev/null || echo "unknown")
  EXPIRES_TS=$(date -f "%Y-%m-%dT%H:%M:%S" "$EXPIRES" +%s 2>/dev/null || echo 0)
  NOW=$(date +%s)
  DIFF=$((EXPIRES_TS - NOW))
  DIFF_HOURS=$((DIFF / 3600))

  if [[ "$DIFF_HOURS" -lt 24 ]]; then
    log "WARNING: Codex token expires in ${DIFF_HOURS}h"
    
    # Only alert once per 6 hours
    LAST_ALERT_FILE="/tmp/codex-token-alert.txt"
    if [[ -f "$LAST_ALERT_FILE" ]]; then
      LAST_ALERT=$(cat "$LAST_ALERT_FILE")
      HOURS_SINCE=$((($NOW - LAST_ALERT) / 3600))
      if [[ "$HOURS_SINCE" -lt 6 ]]; then
        exit 0
      fi
    fi
    
    # Send notification
    curl -s -X POST "$NOTIFICATION_URL" \
      -H "Content-Type: application/json" \
      -d "{
        \"title\": \"Codex OAuth Token Expiring\",
        \"message\": \"Token expires in ${DIFF_HOURS}h. Refresh required to restore model service.\",
        \"priority\": \"high\",
        \"type\": \"alert\"
      }" 2>/dev/null || true
    
    echo "$NOW" > "$LAST_ALERT_FILE"
  fi
else
  log "INFO: No token metadata found; skipping expiry check"
fi

log "OK: Codex token check completed"
