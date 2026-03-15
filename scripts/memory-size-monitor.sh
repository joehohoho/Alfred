#!/bin/bash
# memory-size-monitor.sh
# Real-time MEMORY.md size monitoring with alerting
# Run every 30 minutes via cron

set -e

MEMORY_FILE="$HOME/.openclaw/workspace/MEMORY.md"
SOFT_LIMIT=15000    # Alert at 75% (15KB)
HARD_LIMIT=19500    # Emergency at 97.5% (19.5KB)
AUDIT_LOG="$HOME/.openclaw/workspace/memory/size-audit.log"
ALERT_COOLDOWN_FILE="/tmp/memory-size-alert-cooldown"
COOLDOWN_MINUTES=60

# Ensure log file exists
mkdir -p "$(dirname "$AUDIT_LOG")"
touch "$AUDIT_LOG"

CURRENT_SIZE=$(wc -c < "$MEMORY_FILE" 2>/dev/null || echo 0)
TIMESTAMP=$(date '+%Y-%m-%dT%H:%M:%S%z')
PERCENT=$((CURRENT_SIZE * 100 / 20000))

# Check cooldown (don't spam alerts)
ALERT_SUPPRESSED=0
if [[ -f "$ALERT_COOLDOWN_FILE" ]]; then
  LAST_ALERT=$(cat "$ALERT_COOLDOWN_FILE")
  MINUTES_AGO=$(( ($(date +%s) - LAST_ALERT) / 60 ))
  if [[ $MINUTES_AGO -lt $COOLDOWN_MINUTES ]]; then
    ALERT_SUPPRESSED=1
  fi
fi

# Log entry format: timestamp | level | size | percent | status
if [[ $CURRENT_SIZE -gt $HARD_LIMIT ]]; then
  echo "$TIMESTAMP | CRITICAL | $CURRENT_SIZE bytes | ${PERCENT}% | HARD LIMIT EXCEEDED" >> "$AUDIT_LOG"
  
  if [[ $ALERT_SUPPRESSED -eq 0 ]]; then
    echo "[CRITICAL] MEMORY.md at $CURRENT_SIZE bytes (${PERCENT}%, hard limit: $HARD_LIMIT)"
    echo "Emergency archival recommended. Run: bash ~/.openclaw/workspace/scripts/memory-smart-archive.sh"
    
    # Mark alert sent (prevent spam)
    date +%s > "$ALERT_COOLDOWN_FILE"
  fi
  
  exit 1
  
elif [[ $CURRENT_SIZE -gt $SOFT_LIMIT ]]; then
  echo "$TIMESTAMP | WARN | $CURRENT_SIZE bytes | ${PERCENT}% | SOFT LIMIT EXCEEDED" >> "$AUDIT_LOG"
  
  if [[ $ALERT_SUPPRESSED -eq 0 ]]; then
    echo "[WARN] MEMORY.md at $CURRENT_SIZE bytes (${PERCENT}%, soft limit: $SOFT_LIMIT)"
    echo "Scheduled nightly archival will trigger at 20:00 AST"
    
    # Mark alert sent
    date +%s > "$ALERT_COOLDOWN_FILE"
  fi
  
  exit 0
  
else
  echo "$TIMESTAMP | OK | $CURRENT_SIZE bytes | ${PERCENT}% | HEALTHY" >> "$AUDIT_LOG"
  exit 0
fi
