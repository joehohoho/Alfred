#!/bin/bash
# gateway-watchdog.sh
# Runs via LaunchAgent every 5 minutes. Monitors gateway health and auto-heals.
#
# Checks:
#   1. Gateway process alive — restart if dead
#   2. Rate limit circuit breaker with PROGRESSIVE BACKOFF
#      First trip: 10 min. Doubles each consecutive trip: 10 → 20 → 40 → 60 (max).
#      Resets to 10 min after 2 hours of no trips.
#   3. Cron failure monitor — 3+ consecutive errors → auto-disable + alert
#   4. Session count sanity — alert if > 30
#   5. Error log size — truncate if > 5MB
#
# All alerts go to Command Center notifications.

set -euo pipefail

LOG="$HOME/.openclaw/logs/gateway-watchdog.log"
ERR_LOG="$HOME/.openclaw/logs/gateway.err.log"
JOBS_FILE="$HOME/.openclaw/cron/jobs.json"
SESSIONS_JSON="$HOME/.openclaw/agents/main/sessions/sessions.json"
NOTIFY_URL="http://localhost:3001/api/notifications"
STATE_DIR="$HOME/.openclaw/workspace/.hal-alfred-tracking"
CIRCUIT_BREAKER_FILE="$STATE_DIR/rate-limit-circuit-breaker.json"

# Rate limit thresholds
RATE_LIMIT_THRESHOLD=3          # errors in window to trigger circuit breaker
RATE_LIMIT_WINDOW_MIN=5         # window in minutes to check
CRON_FAIL_THRESHOLD=3           # consecutive failures to disable a cron
MIN_COOLDOWN_MIN=10             # starting cooldown
MAX_COOLDOWN_MIN=60             # maximum cooldown (1 hour)
BACKOFF_RESET_MIN=120           # reset backoff after 2h of no trips

ts() { date '+%Y-%m-%dT%H:%M:%S'; }
log() { echo "[$(ts)] $*" >> "$LOG"; }

notify() {
  local title="$1" message="$2"
  curl -s --max-time 10 -X POST "$NOTIFY_URL" \
    -H "Content-Type: application/json" \
    -d "{\"type\":\"system\",\"title\":\"$title\",\"message\":\"$message\"}" \
    > /dev/null 2>&1 || true
}

# Read circuit breaker state (JSON: {tripped_at, cooldown_min, trip_count, last_trip_at, daily_errors, daily_reset_at})
read_cb_state() {
  if [[ -f "$CIRCUIT_BREAKER_FILE" ]]; then
    python3 -c "
import json, sys
try:
    with open('$CIRCUIT_BREAKER_FILE') as f:
        d = json.load(f)
    print(f'{d.get(\"tripped_at\",0)}|{d.get(\"cooldown_min\",10)}|{d.get(\"trip_count\",0)}|{d.get(\"last_trip_at\",0)}|{d.get(\"daily_errors\",0)}|{d.get(\"daily_reset_at\",0)}')
except:
    print('0|10|0|0|0|0')
" 2>/dev/null || echo "0|10|0|0|0|0"
  else
    echo "0|10|0|0|0|0"
  fi
}

write_cb_state() {
  local tripped_at="$1" cooldown_min="$2" trip_count="$3" last_trip_at="$4" daily_errors="$5" daily_reset_at="$6"
  python3 -c "
import json
with open('$CIRCUIT_BREAKER_FILE', 'w') as f:
    json.dump({'tripped_at': $tripped_at, 'cooldown_min': $cooldown_min, 'trip_count': $trip_count, 'last_trip_at': $last_trip_at, 'daily_errors': $daily_errors, 'daily_reset_at': $daily_reset_at}, f)
" 2>/dev/null
}

# Daily error threshold constants
DAILY_ERROR_WARN=15           # 15+ errors → 4h minimum cooldown
DAILY_ERROR_CRITICAL=30       # 30+ errors → 8h cooldown (wait for next day)

mkdir -p "$STATE_DIR"

# ============================================================
# 1. Gateway process check
# ============================================================
GATEWAY_PID=$(pgrep -f "openclaw-gateway" 2>/dev/null | head -1 || true)

if [[ -z "$GATEWAY_PID" ]]; then
  # Read circuit breaker state
  IFS='|' read -r CB_TRIPPED CB_COOLDOWN CB_COUNT CB_LAST_TRIP CB_DAILY CB_DAILY_RESET <<< "$(read_cb_state)"
  NOW=$(date +%s)

  if [[ "$CB_TRIPPED" -gt 0 ]]; then
    ELAPSED=$(( NOW - CB_TRIPPED ))
    COOLDOWN_SEC=$(( CB_COOLDOWN * 60 ))

    if [[ "$ELAPSED" -lt "$COOLDOWN_SEC" ]]; then
      REMAINING=$(( COOLDOWN_SEC - ELAPSED ))
      # Only log cooldown every ~1 hour (12 cycles × 5 min) to reduce log pollution
      CYCLES_IN=$(( ELAPSED / 300 ))
      if [[ "$CYCLES_IN" -eq 0 ]] || [[ $(( CYCLES_IN % 12 )) -eq 0 ]]; then
        log "CIRCUIT_BREAKER: Cooling down, ${REMAINING}s remaining (${CB_COOLDOWN}m cooldown, trip #${CB_COUNT}, daily=${CB_DAILY})"
      fi
      exit 0
    fi

    # Cooldown expired — restart gateway
    log "CIRCUIT_BREAKER: Cooldown complete (${CB_COOLDOWN}m), restarting gateway"
    # Keep the state but clear tripped_at — backoff level persists
    write_cb_state 0 "$CB_COOLDOWN" "$CB_COUNT" "$CB_LAST_TRIP" "$CB_DAILY" "$CB_DAILY_RESET"

    launchctl kickstart gui/$(id -u)/ai.openclaw.gateway 2>/dev/null || true
    sleep 5
    NEW_PID=$(pgrep -f "openclaw-gateway" 2>/dev/null | head -1 || true)
    if [[ -n "$NEW_PID" ]]; then
      log "RECOVERED: Gateway restarted after ${CB_COOLDOWN}m cooldown (PID $NEW_PID)"
      notify "Gateway Recovered" "Gateway restarted after ${CB_COOLDOWN}-minute rate limit cooldown (trip #${CB_COUNT})."
    else
      log "FAILED: Gateway did not restart"
      notify "Gateway Recovery Failed" "Gateway failed to restart after cooldown. Manual intervention needed."
    fi
    exit 0
  fi

  # Gateway down unexpectedly (no circuit breaker active)
  log "ALERT: Gateway not running, restarting..."
  launchctl kickstart gui/$(id -u)/ai.openclaw.gateway 2>/dev/null || true
  sleep 5
  NEW_PID=$(pgrep -f "openclaw-gateway" 2>/dev/null | head -1 || true)
  if [[ -n "$NEW_PID" ]]; then
    log "RECOVERED: Gateway restarted (PID $NEW_PID)"
    notify "Gateway Auto-Restart" "Gateway was down, auto-restarted successfully."
  else
    log "FAILED: Gateway restart failed"
    notify "Gateway Down" "Gateway is down and auto-restart failed. Check manually."
  fi
  exit 0
fi

# ============================================================
# 2. Rate limit circuit breaker (progressive backoff)
# ============================================================
if [[ -f "$ERR_LOG" ]]; then
  CUTOFF=$(date -v-${RATE_LIMIT_WINDOW_MIN}M '+%Y-%m-%dT%H:%M' 2>/dev/null || date -d "-${RATE_LIMIT_WINDOW_MIN} minutes" '+%Y-%m-%dT%H:%M' 2>/dev/null || echo "")

  if [[ -n "$CUTOFF" ]]; then
    RECENT_RATE_LIMITS=0
    while IFS= read -r line; do
      LOG_TS=$(echo "$line" | grep -oE '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}' || true)
      if [[ -n "$LOG_TS" && "$LOG_TS" > "$CUTOFF" ]]; then
        RECENT_RATE_LIMITS=$((RECENT_RATE_LIMITS + 1))
      fi
    done < <(grep "rate limit" "$ERR_LOG" 2>/dev/null | grep "embedded run agent end" || true)

    if [[ "$RECENT_RATE_LIMITS" -ge "$RATE_LIMIT_THRESHOLD" ]]; then
      # Read current backoff state
      IFS='|' read -r CB_TRIPPED CB_COOLDOWN CB_COUNT CB_LAST_TRIP CB_DAILY CB_DAILY_RESET <<< "$(read_cb_state)"
      NOW=$(date +%s)

      # Reset daily counter at midnight
      TODAY_MIDNIGHT=$(date -v0H -v0M -v0S +%s 2>/dev/null || date -d "today 00:00" +%s 2>/dev/null || echo "0")
      if [[ "$CB_DAILY_RESET" -lt "$TODAY_MIDNIGHT" ]]; then
        CB_DAILY=0
        CB_DAILY_RESET="$TODAY_MIDNIGHT"
      fi

      # Increment daily error counter
      CB_DAILY=$(( CB_DAILY + RECENT_RATE_LIMITS ))

      # Calculate new cooldown with progressive backoff
      if [[ "$CB_LAST_TRIP" -gt 0 ]]; then
        SINCE_LAST_TRIP=$(( NOW - CB_LAST_TRIP ))
        if [[ "$SINCE_LAST_TRIP" -gt $(( BACKOFF_RESET_MIN * 60 )) ]]; then
          # Been 2+ hours since last trip — reset backoff
          NEW_COOLDOWN=$MIN_COOLDOWN_MIN
          NEW_COUNT=1
        else
          # Double the cooldown (progressive backoff)
          NEW_COOLDOWN=$(( CB_COOLDOWN * 2 ))
          [[ "$NEW_COOLDOWN" -gt "$MAX_COOLDOWN_MIN" ]] && NEW_COOLDOWN=$MAX_COOLDOWN_MIN
          NEW_COUNT=$(( CB_COUNT + 1 ))
        fi
      else
        NEW_COOLDOWN=$MIN_COOLDOWN_MIN
        NEW_COUNT=1
      fi

      # Daily error escalation — override cooldown if daily cap exceeded
      if [[ "$CB_DAILY" -ge "$DAILY_ERROR_CRITICAL" ]]; then
        NEW_COOLDOWN=480  # 8 hours — provider daily cap likely exhausted
        log "DAILY_CAP: $CB_DAILY errors today (critical ≥$DAILY_ERROR_CRITICAL) — 8h cooldown"
      elif [[ "$CB_DAILY" -ge "$DAILY_ERROR_WARN" ]]; then
        [[ "$NEW_COOLDOWN" -lt 240 ]] && NEW_COOLDOWN=240  # 4h minimum
        log "DAILY_CAP: $CB_DAILY errors today (warn ≥$DAILY_ERROR_WARN) — ${NEW_COOLDOWN}m cooldown"
      fi

      log "CIRCUIT_BREAKER: $RECENT_RATE_LIMITS rate limit errors — trip #${NEW_COUNT}, cooldown ${NEW_COOLDOWN}m, daily=${CB_DAILY}"

      # Stop gateway
      pkill -f openclaw-gateway 2>/dev/null || true

      # Save state with progressive backoff + daily tracking
      write_cb_state "$NOW" "$NEW_COOLDOWN" "$NEW_COUNT" "$NOW" "$CB_DAILY" "$CB_DAILY_RESET"

      # Truncate error log
      > "$ERR_LOG"

      # Clean sessions while gateway is down
      bash "$HOME/.openclaw/workspace/scripts/session-cleanup.sh" 2>/dev/null || true

      notify "Rate Limit Circuit Breaker" "Trip #${NEW_COUNT}: Gateway stopped for ${NEW_COOLDOWN}m. $RECENT_RATE_LIMITS errors (${CB_DAILY} today). Sessions cleaned."
      exit 0
    fi
  fi
fi

# ============================================================
# 3. Reset backoff if stable
# ============================================================
# If gateway has been running cleanly for 2+ hours, reset backoff state
IFS='|' read -r CB_TRIPPED CB_COOLDOWN CB_COUNT CB_LAST_TRIP CB_DAILY CB_DAILY_RESET <<< "$(read_cb_state)"
NOW=$(date +%s)
if [[ "$CB_LAST_TRIP" -gt 0 && "$CB_COUNT" -gt 0 ]]; then
  SINCE_LAST=$(( NOW - CB_LAST_TRIP ))
  if [[ "$SINCE_LAST" -gt $(( BACKOFF_RESET_MIN * 60 )) ]]; then
    log "BACKOFF_RESET: No trips in ${BACKOFF_RESET_MIN}m, resetting backoff (was trip #${CB_COUNT}, ${CB_COOLDOWN}m, daily=${CB_DAILY})"
    # Reset trip backoff but keep daily counter (resets at midnight)
    write_cb_state 0 "$MIN_COOLDOWN_MIN" 0 0 "$CB_DAILY" "$CB_DAILY_RESET"
  fi
fi

# ============================================================
# 4. Cron failure monitor
# ============================================================
if [[ -f "$JOBS_FILE" ]]; then
  python3 - "$JOBS_FILE" "$CRON_FAIL_THRESHOLD" << 'PYCHECK'
import json, sys, os
from datetime import datetime

jobs_file = sys.argv[1]
threshold = int(sys.argv[2])
log_path = os.path.expanduser("~/.openclaw/logs/gateway-watchdog.log")
notify_url = "http://localhost:3001/api/notifications"

with open(jobs_file) as f:
    data = json.load(f)

changed = False
alerts = []

for job in data.get("jobs", []):
    if not job.get("enabled", True):
        continue
    state = job.get("state", {})
    errors = state.get("consecutiveErrors", 0)
    name = job.get("name", "unnamed")

    if errors >= threshold:
        job["enabled"] = False
        job["_autoDisabledAt"] = datetime.now().isoformat()
        job["_autoDisabledReason"] = f"{errors} consecutive failures"
        changed = True
        alerts.append(f"{name}: {errors} consecutive failures — auto-disabled")

if changed:
    with open(jobs_file, "w") as f:
        json.dump(data, f, indent=2)

for alert in alerts:
    ts = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
    with open(log_path, "a") as f:
        f.write(f"[{ts}] CRON_DISABLED: {alert}\n")

    import urllib.request
    try:
        req = urllib.request.Request(
            notify_url,
            data=json.dumps({"type": "system", "title": "Cron Auto-Disabled", "message": alert}).encode(),
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        urllib.request.urlopen(req, timeout=5)
    except:
        pass
PYCHECK
fi

# ============================================================
# 5. Session count check
# ============================================================
if [[ -f "$SESSIONS_JSON" ]]; then
  SESSION_COUNT=$(python3 -c "import json; print(len(json.load(open('$SESSIONS_JSON'))))" 2>/dev/null || echo "0")
  if [[ "$SESSION_COUNT" -gt 30 ]]; then
    log "WARNING: $SESSION_COUNT sessions (threshold 30)"
  fi
fi

# ============================================================
# 6. Error log size check
# ============================================================
if [[ -f "$ERR_LOG" ]]; then
  ERR_SIZE=$(wc -c < "$ERR_LOG" 2>/dev/null || echo "0")
  if [[ "$ERR_SIZE" -gt 5242880 ]]; then
    log "LOG_ROTATE: gateway.err.log at ${ERR_SIZE} bytes, truncating"
    > "$ERR_LOG"
  fi
fi

# ============================================================
# 7. Watchdog log rotation
# ============================================================
if [[ -f "$LOG" ]]; then
  LOG_SIZE=$(wc -c < "$LOG" 2>/dev/null || echo "0")
  if [[ "$LOG_SIZE" -gt 1048576 ]]; then
    tail -200 "$LOG" > "$LOG.tmp" && mv "$LOG.tmp" "$LOG"
  fi
fi
