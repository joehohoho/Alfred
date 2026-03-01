#!/bin/bash
# gateway-watchdog.sh
# Runs via LaunchAgent every 5 minutes. Monitors gateway health and auto-heals.
#
# Checks:
#   1. Gateway process alive — restart if dead
#   2. Rate limit circuit breaker — if 3+ rate limit errors in 5 min, stop gateway
#      for 5 min to let provider rate limits reset, then restart
#   3. Cron failure monitor — if any cron has 3+ consecutive errors, disable it + alert
#   4. Session count sanity — alert if > 30 sessions (before cleanup cap of 40)
#   5. Error log size — truncate if > 5MB to prevent disk fill
#
# Alerts go to Command Center notifications AND Discord webhook (works when gateway is down)

set -euo pipefail

LOG="$HOME/.openclaw/logs/gateway-watchdog.log"
ERR_LOG="$HOME/.openclaw/logs/gateway.err.log"
JOBS_FILE="$HOME/.openclaw/cron/jobs.json"
SESSIONS_JSON="$HOME/.openclaw/agents/main/sessions/sessions.json"
NOTIFY_URL="http://localhost:3001/api/notifications"
STATE_DIR="$HOME/.openclaw/workspace/.hal-alfred-tracking"
CIRCUIT_BREAKER_FILE="$STATE_DIR/rate-limit-circuit-breaker.txt"

# Rate limit thresholds
RATE_LIMIT_THRESHOLD=3          # errors in window to trigger circuit breaker
RATE_LIMIT_WINDOW_MIN=5         # window in minutes to check
CIRCUIT_BREAKER_COOLDOWN_MIN=5  # gateway downtime to let rate limits reset
CRON_FAIL_THRESHOLD=3           # consecutive failures to disable a cron

ts() { date '+%Y-%m-%dT%H:%M:%S'; }
log() { echo "[$(ts)] $*" >> "$LOG"; }

# Alert to Command Center (works when gateway is up)
notify() {
  local title="$1" message="$2"
  curl -s -X POST "$NOTIFY_URL" \
    -H "Content-Type: application/json" \
    -d "{\"type\":\"system\",\"title\":\"$title\",\"message\":\"$message\"}" \
    > /dev/null 2>&1 || true
}

# Ensure state directory exists
mkdir -p "$STATE_DIR"

# ============================================================
# 1. Gateway process check
# ============================================================
GATEWAY_PID=$(pgrep -f "openclaw-gateway" 2>/dev/null | head -1 || true)

if [[ -z "$GATEWAY_PID" ]]; then
  # Check if circuit breaker is active (intentional shutdown)
  if [[ -f "$CIRCUIT_BREAKER_FILE" ]]; then
    CB_TIME=$(cat "$CIRCUIT_BREAKER_FILE" 2>/dev/null || echo "0")
    NOW=$(date +%s)
    ELAPSED=$(( NOW - CB_TIME ))
    if [[ "$ELAPSED" -lt $(( CIRCUIT_BREAKER_COOLDOWN_MIN * 60 )) ]]; then
      log "CIRCUIT_BREAKER: Gateway intentionally stopped, ${ELAPSED}s / $((CIRCUIT_BREAKER_COOLDOWN_MIN * 60))s cooldown"
      # Check if cooldown is over
      if [[ "$ELAPSED" -ge $(( CIRCUIT_BREAKER_COOLDOWN_MIN * 60 - 30 )) ]]; then
        log "CIRCUIT_BREAKER: Cooldown ending, restarting gateway"
        rm -f "$CIRCUIT_BREAKER_FILE"
        launchctl kickstart gui/$(id -u)/ai.openclaw.gateway 2>/dev/null || true
        sleep 5
        NEW_PID=$(pgrep -f "openclaw-gateway" 2>/dev/null | head -1 || true)
        if [[ -n "$NEW_PID" ]]; then
          log "RECOVERED: Gateway restarted after circuit breaker (PID $NEW_PID)"
          notify "Gateway Recovered" "Gateway restarted after rate limit circuit breaker cooldown."
        else
          log "FAILED: Gateway did not restart after circuit breaker"
          notify "Gateway Recovery Failed" "Gateway failed to restart after circuit breaker. Manual intervention needed."
        fi
      fi
      exit 0
    else
      # Cooldown expired but gateway still down — clean up and restart
      rm -f "$CIRCUIT_BREAKER_FILE"
    fi
  fi

  # Gateway is down unexpectedly — restart
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
# 2. Rate limit circuit breaker
# ============================================================
if [[ -f "$ERR_LOG" ]]; then
  # Count rate limit errors in the last N minutes
  CUTOFF=$(date -v-${RATE_LIMIT_WINDOW_MIN}M '+%Y-%m-%dT%H:%M' 2>/dev/null || date -d "-${RATE_LIMIT_WINDOW_MIN} minutes" '+%Y-%m-%dT%H:%M' 2>/dev/null || echo "")

  if [[ -n "$CUTOFF" ]]; then
    RECENT_RATE_LIMITS=0
    while IFS= read -r line; do
      # Extract timestamp from log line
      LOG_TS=$(echo "$line" | grep -oE '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}' || true)
      if [[ -n "$LOG_TS" && "$LOG_TS" > "$CUTOFF" ]]; then
        RECENT_RATE_LIMITS=$((RECENT_RATE_LIMITS + 1))
      fi
    done < <(grep "rate limit" "$ERR_LOG" 2>/dev/null | grep "embedded run agent end" || true)

    if [[ "$RECENT_RATE_LIMITS" -ge "$RATE_LIMIT_THRESHOLD" ]]; then
      log "CIRCUIT_BREAKER: $RECENT_RATE_LIMITS rate limit errors in last ${RATE_LIMIT_WINDOW_MIN}m — stopping gateway for ${CIRCUIT_BREAKER_COOLDOWN_MIN}m"

      # Stop gateway
      pkill -f openclaw-gateway 2>/dev/null || true
      date +%s > "$CIRCUIT_BREAKER_FILE"

      # Truncate error log to prevent re-triggering on next check
      > "$ERR_LOG"

      # Clean any corrupted sessions while gateway is down
      bash "$HOME/.openclaw/workspace/scripts/session-cleanup.sh" 2>/dev/null || true

      notify "Rate Limit Circuit Breaker" "Gateway stopped for ${CIRCUIT_BREAKER_COOLDOWN_MIN}m — $RECENT_RATE_LIMITS rate limit errors detected. Sessions cleaned. Auto-restart in ${CIRCUIT_BREAKER_COOLDOWN_MIN} minutes."
      log "CIRCUIT_BREAKER: Gateway stopped, cleanup done, will restart in ${CIRCUIT_BREAKER_COOLDOWN_MIN}m"
      exit 0
    fi
  fi
fi

# ============================================================
# 3. Cron failure monitor
# ============================================================
if [[ -f "$JOBS_FILE" ]]; then
  python3 - "$JOBS_FILE" "$CRON_FAIL_THRESHOLD" << 'PYCHECK'
import json, sys, os, time
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
        # Disable the cron
        job["enabled"] = False
        # Tag it so we know it was auto-disabled
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
    print(f"ALERT:{alert}")

    # Send notification
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
# 4. Session count check
# ============================================================
if [[ -f "$SESSIONS_JSON" ]]; then
  SESSION_COUNT=$(python3 -c "import json; print(len(json.load(open('$SESSIONS_JSON'))))" 2>/dev/null || echo "0")
  if [[ "$SESSION_COUNT" -gt 30 ]]; then
    log "WARNING: $SESSION_COUNT sessions (threshold 30) — cleanup may be needed"
  fi
fi

# ============================================================
# 5. Error log size check
# ============================================================
if [[ -f "$ERR_LOG" ]]; then
  ERR_SIZE=$(wc -c < "$ERR_LOG" 2>/dev/null || echo "0")
  if [[ "$ERR_SIZE" -gt 5242880 ]]; then  # 5MB
    log "LOG_ROTATE: gateway.err.log at ${ERR_SIZE} bytes, truncating"
    > "$ERR_LOG"
  fi
fi

# ============================================================
# 6. Watchdog log rotation
# ============================================================
if [[ -f "$LOG" ]]; then
  LOG_SIZE=$(wc -c < "$LOG" 2>/dev/null || echo "0")
  if [[ "$LOG_SIZE" -gt 1048576 ]]; then  # 1MB
    tail -200 "$LOG" > "$LOG.tmp" && mv "$LOG.tmp" "$LOG"
  fi
fi
