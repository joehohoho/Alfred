#!/bin/bash
# health-monitor-cron.sh
# 
# Runs every 15 minutes via cron.
# - Generates health snapshot
# - Compares to previous snapshot
# - Alerts Joe if critical service goes down
# - Automatically recovers if service comes back online
#
# Usage: As a cron job (automated)
# Manual: bash health-monitor-cron.sh
#

WORKSPACE="$HOME/.openclaw/workspace"
HEALTH_DIR="$WORKSPACE/health"
MEMORY_DIR="$WORKSPACE/memory"
SCRIPT_DIR="$WORKSPACE/scripts"

mkdir -p "$HEALTH_DIR" "$MEMORY_DIR"

# Run health monitor
node "$SCRIPT_DIR/health-monitor.js" --json > "$HEALTH_DIR/current-snapshot.json" 2>&1

if [ $? -ne 0 ]; then
  echo "[$(date)] health-monitor.js failed" >> "$MEMORY_DIR/health-monitor.log"
  exit 1
fi

# Load snapshots
CURRENT=$(cat "$HEALTH_DIR/current-snapshot.json")
PREVIOUS="$HEALTH_DIR/previous-snapshot.json"

# First run: no previous snapshot
if [ ! -f "$PREVIOUS" ]; then
  cp "$HEALTH_DIR/current-snapshot.json" "$PREVIOUS"
  exit 0
fi

# Compare health scores
CURRENT_SCORE=$(echo "$CURRENT" | jq -r '.summary.healthScore')
PREVIOUS_SCORE=$(cat "$PREVIOUS" | jq -r '.summary.healthScore')

if [ "$CURRENT_SCORE" != "$PREVIOUS_SCORE" ]; then
  # Health status changed
  
  CURRENT_CRITICAL=$(echo "$CURRENT" | jq -r '.summary.criticalDown')
  PREVIOUS_CRITICAL=$(cat "$PREVIOUS" | jq -r '.summary.criticalDown')
  
  CURRENT_HAL=$(echo "$CURRENT" | jq -r '.summary.halStatus')
  PREVIOUS_HAL=$(cat "$PREVIOUS" | jq -r '.summary.halStatus')
  
  # Build alert message
  MESSAGE=""
  
  if [ "$CURRENT_CRITICAL" -gt "$PREVIOUS_CRITICAL" ]; then
    # Service went down
    DIFF=$((CURRENT_CRITICAL - PREVIOUS_CRITICAL))
    MESSAGE="⚠️ ALERT: $DIFF critical service(s) just went down\n"
    
    # List which ones
    AFFECTED=$(echo "$CURRENT" | jq -r '.agents | to_entries[] | select(.value.critical and (.value.status == "disabled" or .value.status == "offline")) | .key')
    while IFS= read -r service; do
      if ! grep -q "$service" <(cat "$PREVIOUS" | jq -r '.agents | to_entries[] | select(.value.status == "running") | .key'); then
        MESSAGE="${MESSAGE}  - ${service##*.} (now $(echo "$CURRENT" | jq -r ".agents[\"$service\"].status"))\n"
      fi
    done <<< "$AFFECTED"
    
  elif [ "$CURRENT_CRITICAL" -lt "$PREVIOUS_CRITICAL" ]; then
    # Service came back online
    DIFF=$((PREVIOUS_CRITICAL - CURRENT_CRITICAL))
    MESSAGE="✅ RECOVERY: $DIFF service(s) came back online\n"
  fi
  
  if [ "$CURRENT_HAL" != "$PREVIOUS_HAL" ]; then
    MESSAGE="${MESSAGE}HAL gateway: $PREVIOUS_HAL → $CURRENT_HAL\n"
  fi
  
  # Send alert to Command Center via notification
  if [ -n "$MESSAGE" ]; then
    # Log the alert
    echo -e "[$(date)] $MESSAGE" >> "$MEMORY_DIR/health-monitor.log"
    
    # Send Command Center notification
    # (requires Command Center API endpoint)
    # curl -s -X POST http://localhost:3000/api/notifications \
    #   -H "Content-Type: application/json" \
    #   -d "{\"type\":\"service-health\",\"message\":\"$MESSAGE\"}" 2>/dev/null || true
    
    echo -e "$MESSAGE" # Log to stdout for now
  fi
  
  # Update previous snapshot
  cp "$HEALTH_DIR/current-snapshot.json" "$PREVIOUS"
fi

exit 0
