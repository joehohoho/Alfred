#!/bin/bash
# gateway-watchdog.sh
# Runs via LaunchAgent every 5 minutes. Monitors gateway health and auto-heals.
#
# TWO-TIER RATE LIMIT RESPONSE (prevents unnecessary downtime):
#
#   Tier 1 — THROTTLE (soft):
#     Trigger: 5+ rate limit errors in 15 minutes
#     Action: Disable non-essential crons to reduce API load
#     Gateway STAYS RUNNING (Discord, Slack, chat, iMessage unaffected)
#     Auto-re-enables crons after 30 min of no new errors
#
#   Tier 2 — KILL (hard, for genuine death spirals):
#     Trigger: 20+ rate limit errors in 15 minutes
#     Action: Kill gateway, progressive backoff, session cleanup
#     Only fires when throttling is insufficient
#
# Other checks:
#   - Gateway process alive → restart if dead
#   - Cron failure monitor → 3+ consecutive errors → auto-disable + alert
#   - Session count sanity → alert if > 30
#   - Error log size → truncate if > 5MB
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
ERROR_SAMPLES_FILE="$STATE_DIR/rate-limit-error-samples.log"

# ── Tier 1 (throttle) thresholds ──
THROTTLE_THRESHOLD=5              # errors in window to throttle crons
THROTTLE_WINDOW_MIN=15            # window in minutes
THROTTLE_RECOVERY_MIN=30          # minutes of no errors before re-enabling crons

# ── Tier 2 (kill) thresholds ──
KILL_THRESHOLD=20                 # errors in window for hard kill
KILL_WINDOW_MIN=15                # window in minutes

# ── Progressive backoff (Tier 2 only) ──
CRON_FAIL_THRESHOLD=3             # consecutive cron failures to disable
MIN_COOLDOWN_MIN=10               # starting cooldown
MAX_COOLDOWN_MIN=60               # maximum cooldown (1 hour)
BACKOFF_RESET_MIN=120             # reset backoff after 2h of no trips

# ── Daily caps ──
DAILY_ERROR_WARN=15               # 15+ errors → 4h minimum cooldown
DAILY_ERROR_CRITICAL=30           # 30+ errors → 8h cooldown

ts() { date '+%Y-%m-%dT%H:%M:%S'; }
log() { echo "[$(ts)] $*" >> "$LOG"; }

LAST_NOTIFY_FILE="/tmp/watchdog-last-notify.json"
notify() {
  local title="$1" message="$2"
  # Dedup: don't send the same title within 2 hours
  local now=$(date +%s)
  local should_send="yes"
  if [[ -f "$LAST_NOTIFY_FILE" ]]; then
    local last_title last_time
    last_title=$(python3 -c "import json; print(json.load(open('$LAST_NOTIFY_FILE')).get('title',''))" 2>/dev/null || echo "")
    last_time=$(python3 -c "import json; print(json.load(open('$LAST_NOTIFY_FILE')).get('at',0))" 2>/dev/null || echo "0")
    if [[ "$last_title" == "$title" && $((now - last_time)) -lt 7200 ]]; then
      should_send="no"
    fi
  fi
  if [[ "$should_send" == "yes" ]]; then
    curl -s --max-time 10 -X POST "$NOTIFY_URL" \
      -H "Content-Type: application/json" \
      -d "{\"type\":\"system\",\"title\":\"$title\",\"message\":\"$message\"}" \
      > /dev/null 2>&1 || true
    python3 -c "import json; json.dump({'title':'$title','at':$now}, open('$LAST_NOTIFY_FILE','w'))" 2>/dev/null || true
  fi
}

# ── Circuit breaker state I/O ──
# Fields: tripped_at|cooldown_min|trip_count|last_trip_at|daily_errors|daily_reset_at|throttled_at
read_cb_state() {
  if [[ -f "$CIRCUIT_BREAKER_FILE" ]]; then
    python3 -c "
import json, sys
try:
    with open('$CIRCUIT_BREAKER_FILE') as f:
        d = json.load(f)
    print(f'{d.get(\"tripped_at\",0)}|{d.get(\"cooldown_min\",10)}|{d.get(\"trip_count\",0)}|{d.get(\"last_trip_at\",0)}|{d.get(\"daily_errors\",0)}|{d.get(\"daily_reset_at\",0)}|{d.get(\"throttled_at\",0)}')
except:
    print('0|10|0|0|0|0|0')
" 2>/dev/null || echo "0|10|0|0|0|0|0"
  else
    echo "0|10|0|0|0|0|0"
  fi
}

write_cb_state() {
  local tripped_at="$1" cooldown_min="$2" trip_count="$3" last_trip_at="$4" daily_errors="$5" daily_reset_at="$6" throttled_at="${7:-0}"
  python3 -c "
import json
with open('$CIRCUIT_BREAKER_FILE', 'w') as f:
    json.dump({'tripped_at': $tripped_at, 'cooldown_min': $cooldown_min, 'trip_count': $trip_count, 'last_trip_at': $last_trip_at, 'daily_errors': $daily_errors, 'daily_reset_at': $daily_reset_at, 'throttled_at': $throttled_at}, f)
" 2>/dev/null
}

# Count rate limit errors in the last N minutes from the error log
count_recent_errors() {
  local window_min="$1"
  local cutoff
  # IMPORTANT: use -u for UTC — gateway error log timestamps are in UTC (ending in Z)
  cutoff=$(date -u -v-${window_min}M '+%Y-%m-%dT%H:%M' 2>/dev/null || date -u -d "-${window_min} minutes" '+%Y-%m-%dT%H:%M' 2>/dev/null || echo "")
  if [[ -z "$cutoff" || ! -f "$ERR_LOG" ]]; then
    echo 0
    return
  fi
  local count=0
  while IFS= read -r line; do
    local log_ts
    log_ts=$(echo "$line" | grep -oE '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}' || true)
    if [[ -n "$log_ts" && "$log_ts" > "$cutoff" ]]; then
      count=$((count + 1))
    fi
  done < <(grep "rate limit" "$ERR_LOG" 2>/dev/null | grep "embedded run agent end" || true)
  echo "$count"
}

# Save error samples for debugging (append, don't overwrite)
save_error_samples() {
  local label="$1"
  echo "=== $label at $(ts) ===" >> "$ERROR_SAMPLES_FILE" 2>/dev/null || true
  grep "rate limit" "$ERR_LOG" 2>/dev/null | grep "embedded run agent end" | tail -5 >> "$ERROR_SAMPLES_FILE" 2>/dev/null || true
  # Keep samples file under 100KB
  local sz
  sz=$(wc -c < "$ERROR_SAMPLES_FILE" 2>/dev/null || echo "0")
  if [[ "$sz" -gt 102400 ]]; then
    tail -200 "$ERROR_SAMPLES_FILE" > "$ERROR_SAMPLES_FILE.tmp" && mv "$ERROR_SAMPLES_FILE.tmp" "$ERROR_SAMPLES_FILE" 2>/dev/null || true
  fi
}

# Throttle crons (Tier 1): disable non-essential crons to reduce API load
throttle_crons() {
  python3 - "$JOBS_FILE" << 'PYEOF'
import json, sys
from datetime import datetime

jobs_file = sys.argv[1]
with open(jobs_file) as f:
    data = json.load(f)

count = 0
# Keep essential: none really — all crons are less important than gateway uptime
# But Log Rotation and Backup use minimal API, so skip those
skip_names = {"Log Rotation", "Alfred Backup - Tier 3 (Full System Weekly)"}

for job in data.get("jobs", []):
    if not job.get("enabled", True):
        continue
    if job.get("name", "") in skip_names:
        continue
    if job.get("_autoDisabledReason", "").startswith("PERMANENT:"):
        continue
    job["enabled"] = False
    job["_autoDisabledAt"] = datetime.now().isoformat()
    job["_autoDisabledReason"] = "rate limit throttle"
    count += 1

with open(jobs_file, "w") as f:
    json.dump(data, f, indent=2)

print(count)
PYEOF
}

# Unthrottle crons: re-enable crons that were disabled by throttle
unthrottle_crons() {
  python3 - "$JOBS_FILE" << 'PYEOF'
import json, sys

jobs_file = sys.argv[1]
with open(jobs_file) as f:
    data = json.load(f)

count = 0
for job in data.get("jobs", []):
    if job.get("_autoDisabledReason") == "rate limit throttle":
        job["enabled"] = True
        job.pop("_autoDisabledAt", None)
        job.pop("_autoDisabledReason", None)
        count += 1

with open(jobs_file, "w") as f:
    json.dump(data, f, indent=2)

print(count)
PYEOF
}

mkdir -p "$STATE_DIR"

# ============================================================
# 1. Gateway process check
# ============================================================
GATEWAY_PID=$(pgrep -f "openclaw-gateway" 2>/dev/null | head -1 || true)

if [[ -z "$GATEWAY_PID" ]]; then
  # Read circuit breaker state
  IFS='|' read -r CB_TRIPPED CB_COOLDOWN CB_COUNT CB_LAST_TRIP CB_DAILY CB_DAILY_RESET CB_THROTTLED <<< "$(read_cb_state)"
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

    # Re-enable any crons orphaned by Tier 1 → Tier 2 escalation (BUG #3 fix)
    REENABLED=$(unthrottle_crons 2>/dev/null || echo "0")
    if [[ "$REENABLED" -gt 0 ]]; then
      log "UNTHROTTLE: Re-enabled $REENABLED crons orphaned by Tier 2 kill"
    fi

    # Keep the state but clear tripped_at and throttled_at — backoff level persists
    write_cb_state 0 "$CB_COOLDOWN" "$CB_COUNT" "$CB_LAST_TRIP" "$CB_DAILY" "$CB_DAILY_RESET" 0

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
# 2. Rate limit detection (two-tier response)
# ============================================================
if [[ -f "$ERR_LOG" ]]; then
  RECENT_ERRORS=$(count_recent_errors "$KILL_WINDOW_MIN")

  if [[ "$RECENT_ERRORS" -gt 0 ]]; then
    IFS='|' read -r CB_TRIPPED CB_COOLDOWN CB_COUNT CB_LAST_TRIP CB_DAILY CB_DAILY_RESET CB_THROTTLED <<< "$(read_cb_state)"
    NOW=$(date +%s)

    # Reset daily counter at midnight
    TODAY_MIDNIGHT=$(date -v0H -v0M -v0S +%s 2>/dev/null || date -d "today 00:00" +%s 2>/dev/null || echo "0")
    if [[ "$CB_DAILY_RESET" -lt "$TODAY_MIDNIGHT" ]]; then
      CB_DAILY=0
      CB_DAILY_RESET="$TODAY_MIDNIGHT"
    fi

    # ── Tier 2: KILL (genuine death spiral) ──
    if [[ "$RECENT_ERRORS" -ge "$KILL_THRESHOLD" ]]; then
      CB_DAILY=$(( CB_DAILY + RECENT_ERRORS ))

      save_error_samples "TIER2_KILL"

      # Progressive backoff calculation
      if [[ "$CB_LAST_TRIP" -gt 0 ]]; then
        SINCE_LAST_TRIP=$(( NOW - CB_LAST_TRIP ))
        if [[ "$SINCE_LAST_TRIP" -gt $(( BACKOFF_RESET_MIN * 60 )) ]]; then
          NEW_COOLDOWN=$MIN_COOLDOWN_MIN
          NEW_COUNT=1
        else
          NEW_COOLDOWN=$(( CB_COOLDOWN * 2 ))
          [[ "$NEW_COOLDOWN" -gt "$MAX_COOLDOWN_MIN" ]] && NEW_COOLDOWN=$MAX_COOLDOWN_MIN
          NEW_COUNT=$(( CB_COUNT + 1 ))
        fi
      else
        NEW_COOLDOWN=$MIN_COOLDOWN_MIN
        NEW_COUNT=1
      fi

      # Daily error escalation
      if [[ "$CB_DAILY" -ge "$DAILY_ERROR_CRITICAL" ]]; then
        NEW_COOLDOWN=480
        log "DAILY_CAP: $CB_DAILY errors today (critical ≥$DAILY_ERROR_CRITICAL) — 8h cooldown"
      elif [[ "$CB_DAILY" -ge "$DAILY_ERROR_WARN" ]]; then
        [[ "$NEW_COOLDOWN" -lt 240 ]] && NEW_COOLDOWN=240
        log "DAILY_CAP: $CB_DAILY errors today (warn ≥$DAILY_ERROR_WARN) — ${NEW_COOLDOWN}m cooldown"
      fi

      log "TIER2_KILL: $RECENT_ERRORS rate limit errors — trip #${NEW_COUNT}, cooldown ${NEW_COOLDOWN}m, daily=${CB_DAILY}"

      pkill -f openclaw-gateway 2>/dev/null || true
      write_cb_state "$NOW" "$NEW_COOLDOWN" "$NEW_COUNT" "$NOW" "$CB_DAILY" "$CB_DAILY_RESET" 0
      > "$ERR_LOG"
      bash "$HOME/.openclaw/workspace/scripts/session-cleanup.sh" 2>/dev/null || true
      notify "Rate Limit — Gateway Killed" "Tier 2: ${RECENT_ERRORS} errors. Gateway stopped for ${NEW_COOLDOWN}m (trip #${NEW_COUNT}, ${CB_DAILY} today)."
      exit 0
    fi

    # ── Tier 1: THROTTLE (reduce load, keep gateway running) ──
    if [[ "$RECENT_ERRORS" -ge "$THROTTLE_THRESHOLD" ]]; then
      CB_DAILY=$(( CB_DAILY + RECENT_ERRORS ))

      # Only throttle if not already throttled
      if [[ "$CB_THROTTLED" -eq 0 ]]; then
        save_error_samples "TIER1_THROTTLE"

        THROTTLED_COUNT=$(throttle_crons)
        CB_THROTTLED="$NOW"
        write_cb_state "$CB_TRIPPED" "$CB_COOLDOWN" "$CB_COUNT" "$CB_LAST_TRIP" "$CB_DAILY" "$CB_DAILY_RESET" "$CB_THROTTLED"

        log "TIER1_THROTTLE: $RECENT_ERRORS errors in ${THROTTLE_WINDOW_MIN}m — disabled $THROTTLED_COUNT crons (gateway stays running, daily=${CB_DAILY})"
        notify "Rate Limit — Crons Throttled" "Tier 1: ${RECENT_ERRORS} errors. Disabled $THROTTLED_COUNT crons to reduce load. Gateway stays running."
      else
        # Already throttled — just update daily counter
        write_cb_state "$CB_TRIPPED" "$CB_COOLDOWN" "$CB_COUNT" "$CB_LAST_TRIP" "$CB_DAILY" "$CB_DAILY_RESET" "$CB_THROTTLED"
      fi
      # Don't exit — continue to other checks
    fi
  fi
fi

# ============================================================
# 3. Unthrottle crons after stability period
# ============================================================
IFS='|' read -r CB_TRIPPED CB_COOLDOWN CB_COUNT CB_LAST_TRIP CB_DAILY CB_DAILY_RESET CB_THROTTLED <<< "$(read_cb_state)"
NOW=$(date +%s)

if [[ "$CB_THROTTLED" -gt 0 ]]; then
  SINCE_THROTTLE=$(( NOW - CB_THROTTLED ))
  THROTTLE_RECOVERY_SEC=$(( THROTTLE_RECOVERY_MIN * 60 ))

  # Check if there are recent errors (last 10 min — must be fully clear)
  CURRENT_ERRORS=$(count_recent_errors 10)

  if [[ "$SINCE_THROTTLE" -ge "$THROTTLE_RECOVERY_SEC" && "$CURRENT_ERRORS" -eq 0 ]]; then
    REENABLED=$(unthrottle_crons)
    write_cb_state "$CB_TRIPPED" "$CB_COOLDOWN" "$CB_COUNT" "$CB_LAST_TRIP" "$CB_DAILY" "$CB_DAILY_RESET" 0
    log "UNTHROTTLE: $REENABLED crons re-enabled after ${THROTTLE_RECOVERY_MIN}m of stability"
    notify "Crons Re-enabled" "Rate limits stable for ${THROTTLE_RECOVERY_MIN}m. Re-enabled $REENABLED crons."
  fi
fi

# ============================================================
# 4. Reset backoff if stable
# ============================================================
# Re-read state from disk — Section 3 may have written changes (BUG #9 fix)
IFS='|' read -r CB_TRIPPED CB_COOLDOWN CB_COUNT CB_LAST_TRIP CB_DAILY CB_DAILY_RESET CB_THROTTLED <<< "$(read_cb_state)"
NOW=$(date +%s)

if [[ "$CB_LAST_TRIP" -gt 0 && "$CB_COUNT" -gt 0 ]]; then
  SINCE_LAST=$(( NOW - CB_LAST_TRIP ))
  if [[ "$SINCE_LAST" -gt $(( BACKOFF_RESET_MIN * 60 )) ]]; then
    log "BACKOFF_RESET: No trips in ${BACKOFF_RESET_MIN}m, resetting backoff (was trip #${CB_COUNT}, ${CB_COOLDOWN}m, daily=${CB_DAILY})"
    write_cb_state 0 "$MIN_COOLDOWN_MIN" 0 0 "$CB_DAILY" "$CB_DAILY_RESET" "$CB_THROTTLED"
  fi
fi

# ============================================================
# 5. Cron failure monitor
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
# 6. Session count check
# ============================================================
if [[ -f "$SESSIONS_JSON" ]]; then
  SESSION_COUNT=$(python3 -c "import json; print(len(json.load(open('$SESSIONS_JSON'))))" 2>/dev/null || echo "0")
  if [[ "$SESSION_COUNT" -gt 30 ]]; then
    log "WARNING: $SESSION_COUNT sessions (threshold 30)"
  fi
fi

# ============================================================
# 7. Error log size check
# ============================================================
if [[ -f "$ERR_LOG" ]]; then
  ERR_SIZE=$(wc -c < "$ERR_LOG" 2>/dev/null || echo "0")
  if [[ "$ERR_SIZE" -gt 5242880 ]]; then
    log "LOG_ROTATE: gateway.err.log at ${ERR_SIZE} bytes, truncating"
    > "$ERR_LOG"
  fi
fi

# ============================================================
# 8. Watchdog log rotation
# ============================================================
if [[ -f "$LOG" ]]; then
  LOG_SIZE=$(wc -c < "$LOG" 2>/dev/null || echo "0")
  if [[ "$LOG_SIZE" -gt 1048576 ]]; then
    tail -200 "$LOG" > "$LOG.tmp" && mv "$LOG.tmp" "$LOG"
  fi
fi
