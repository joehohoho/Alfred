#!/bin/bash
# gateway-launcher.sh
# Wrapper for LaunchAgent — checks circuit breaker before starting gateway.
# If in cooldown (Tier 2 kill), exits cleanly (LaunchAgent retries after ThrottleInterval).
# Tier 1 (throttle) does NOT block the launcher — gateway stays running.

set -euo pipefail

CB_FILE="$HOME/.openclaw/workspace/.hal-alfred-tracking/rate-limit-circuit-breaker.json"
LOG="$HOME/.openclaw/logs/gateway-watchdog.log"

log() { echo "[$(date '+%Y-%m-%dT%H:%M:%S')] LAUNCHER: $*" >> "$LOG" 2>/dev/null || true; }

if [[ -f "$CB_FILE" ]]; then
  CB_STATE=$(python3 -c "
import json
try:
    with open('$CB_FILE') as f:
        d = json.load(f)
    print(f'{d.get(\"tripped_at\",0)}|{d.get(\"cooldown_min\",10)}|{d.get(\"trip_count\",0)}')
except:
    print('0|10|0')
" 2>/dev/null || echo "0|10|0")

  IFS='|' read -r TRIPPED COOLDOWN COUNT <<< "$CB_STATE"
  NOW=$(date +%s)

  if [[ "$TRIPPED" -gt 0 ]]; then
    ELAPSED=$(( NOW - TRIPPED ))
    COOLDOWN_SEC=$(( COOLDOWN * 60 ))

    if [[ "$ELAPSED" -lt "$COOLDOWN_SEC" ]]; then
      REMAINING=$(( COOLDOWN_SEC - ELAPSED ))
      log "BLOCKED: Circuit breaker active — ${REMAINING}s remaining (${COOLDOWN}m cooldown, trip #${COUNT})"
      exit 0
    fi

    log "CLEAR: Cooldown expired (${COOLDOWN}m, trip #${COUNT}), starting gateway"
  fi
fi

log "Starting gateway"
exec /usr/local/Cellar/node@22/22.22.0/bin/node /usr/local/lib/node_modules/openclaw/dist/entry.js gateway --port 18789
