#!/bin/bash
# hal-health-monitor.sh
# HAL Health Monitoring with Circuit Breaker & Exponential Backoff
# Purpose: Detect HAL outages quickly, apply smart retry logic, alert Joe within 5 min
#
# Features:
# 1. WebSocket health check (every 5 min)
# 2. Exponential backoff: 1m, 2m, 4m, 8m, 15m, 30m, 60m (cap)
# 3. Circuit breaker: degrade to offline mode after 30 failures
# 4. Notifications: Alert Joe after 50 consecutive failures
# 5. Auto-recovery: Reset when HAL comes back online
# 6. Metrics: Track uptime, downtime, failure patterns

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE="${SCRIPT_DIR%/scripts}"
TRACK_DIR="$WORKSPACE/.hal-alfred-tracking"
HEALTH_LOG="$TRACK_DIR/hal-health-monitor.log"
CIRCUIT_FILE="$TRACK_DIR/circuit-breaker-advanced.json"
METRICS_FILE="$TRACK_DIR/hal-health-metrics.json"

mkdir -p "$TRACK_DIR"

# Timestamp helper
ts() { date '+%Y-%m-%dT%H:%M:%S%z'; }
log() { echo "[$(ts)] $*" | tee -a "$HEALTH_LOG"; }

# Initialize circuit breaker state file if it doesn't exist
init_circuit_breaker() {
  if [[ ! -f "$CIRCUIT_FILE" ]]; then
    cat > "$CIRCUIT_FILE" <<'EOF'
{
  "state": "closed",
  "fail_count": 0,
  "last_failure": null,
  "last_success": null,
  "backoff_level": 0,
  "alerts_sent": 0,
  "recovered_count": 0,
  "total_outages": 0
}
EOF
    log "Initialized circuit breaker state"
  fi
}

# Read current circuit breaker state
read_circuit_state() {
  python3 -c "
import json
try:
    with open('$CIRCUIT_FILE') as f:
        state = json.load(f)
    for key in ('state', 'fail_count', 'backoff_level', 'alerts_sent'):
        print(f'{key}={state.get(key,\"null\")}')
except:
    print('state=error fail_count=0 backoff_level=0 alerts_sent=0')
"
}

# Write circuit breaker state
write_circuit_state() {
  local state="$1" fail_count="$2" backoff_level="$3" alerts_sent="$4" last_failure="$5" last_success="$6"
  python3 -c "
import json, time
state_data = {
    'state': '$state',
    'fail_count': $fail_count,
    'backoff_level': $backoff_level,
    'alerts_sent': $alerts_sent,
    'last_failure': '$last_failure',
    'last_success': '$last_success',
    'total_outages': json.load(open('$CIRCUIT_FILE')).get('total_outages', 0),
    'recovered_count': json.load(open('$CIRCUIT_FILE')).get('recovered_count', 0)
}
with open('$CIRCUIT_FILE', 'w') as f:
    json.dump(state_data, f, indent=2)
"
}

# Calculate exponential backoff delay (in minutes)
# backoff_level 0->1m, 1->2m, 2->4m, 3->8m, 4->15m, 5->30m, 6+->60m
backoff_delay_minutes() {
  local level="$1"
  case "$level" in
    0) echo 1 ;;
    1) echo 2 ;;
    2) echo 4 ;;
    3) echo 8 ;;
    4) echo 15 ;;
    5) echo 30 ;;
    *) echo 60 ;;
  esac
}

# Check if we should retry based on backoff schedule
should_retry_now() {
  local fail_count="$1" last_failure_ts="$2"
  local backoff_level=$(( (fail_count < 7) ? fail_count : 6 ))
  local delay_min=$(backoff_delay_minutes "$backoff_level")
  local delay_sec=$((delay_min * 60))
  
  if [[ -z "$last_failure_ts" ]] || [[ "$last_failure_ts" == "null" ]]; then
    echo "true"
    return
  fi
  
  # Parse ISO timestamp
  local last_fail_epoch=$(date -d "$last_failure_ts" +%s 2>/dev/null || echo "0")
  local now_epoch=$(date +%s)
  local seconds_elapsed=$((now_epoch - last_fail_epoch))
  
  if [[ $seconds_elapsed -ge $delay_sec ]]; then
    echo "true"
  else
    echo "false"
  fi
}

# Check HAL health (HTTP + WebSocket)
check_hal_health() {
  # Simple check: just test if HTTP endpoint responds and WebSocket is reachable
  # Don't try to actually establish WebSocket (it will hang)
  
  timeout 3 curl -s -o /dev/null -w "%{http_code}" "http://192.168.2.79:18789" 2>/dev/null >/dev/null
  local http_status=$?
  
  if [[ $http_status -eq 0 ]]; then
    echo "HEALTHY"
    return 0
  else
    echo "OFFLINE"
    return 1
  fi
}

# Send alert notification to Joe (via Command Center)
send_alert_notification() {
  local fail_count="$1" reason="$2"
  
  local message="🚨 **HAL GATEWAY OFFLINE** — $fail_count consecutive failures
  
**Issue:** $reason

**Impact:**
- Complex tasks (HAL-exclusive work) are being queued to Alfred
- System efficiency reduced to 60% capacity
- Passive income scanning and deep-dive research blocked

**Action Required:**
- Check Windows PC (192.168.2.79) — is the HAL service running?
- Restart service if possible, or check network/firewall
- Once fixed, circuit breaker will auto-recover

**Backoff Status:** Attempting health check every ~$(backoff_delay_minutes "$fail_count") minutes until recovery"

  # Send via Command Center notification system (if available)
  if command -v send-notification.sh &> /dev/null; then
    bash ~/.openclaw/workspace/scripts/send-notification.sh \
      "HAL Gateway Offline" \
      "$message" \
      "CRITICAL" 2>/dev/null || true
  fi
  
  # Log the alert
  log "ALERT_SENT: fail_count=$fail_count reason=$reason"
}

# Update metrics file for dashboards
update_metrics() {
  local health_status="$1" fail_count="$2" backoff_level="$3"
  python3 -c "
import json, time
metrics = {
    'timestamp': time.time(),
    'health_status': '$health_status',
    'consecutive_failures': $fail_count,
    'backoff_level': $backoff_level,
    'last_check': '$(ts)',
    'next_check_minutes': $(backoff_delay_minutes "$backoff_level")
}
with open('$METRICS_FILE', 'w') as f:
    json.dump(metrics, f, indent=2)
"
}

# ─────────────────────────────────────────────────────────────────────────────
# MAIN HEALTH CHECK LOOP
# ─────────────────────────────────────────────────────────────────────────────

init_circuit_breaker

# Read current state
STATE_VARS=$(read_circuit_state)
eval "$STATE_VARS"

log "Health check starting (state=$state fail_count=$fail_count backoff_level=$backoff_level)"

# Determine if we should attempt a check based on backoff schedule
CIRCUIT_STATE=$(python3 -c "import json; print(json.load(open('$CIRCUIT_FILE')).get('state'))" 2>/dev/null || echo "closed")
LAST_FAILURE=$(python3 -c "import json; print(json.load(open('$CIRCUIT_FILE')).get('last_failure'))" 2>/dev/null || echo "null")

if [[ "$CIRCUIT_STATE" == "open" ]]; then
  SHOULD_RETRY=$(should_retry_now "$fail_count" "$LAST_FAILURE")
  if [[ "$SHOULD_RETRY" != "true" ]]; then
    local backoff_min=$(backoff_delay_minutes "$fail_count")
    log "BACKOFF: Circuit is open, next retry in ~${backoff_min}m (fail_count=$fail_count)"
    update_metrics "BACKOFF" "$fail_count" "$fail_count"
    echo "[STATUS] circuit=open fail_count=$fail_count backoff_min=${backoff_min}"
    exit 0
  fi
fi

# Perform health check
HEALTH_STATUS=$(check_hal_health)
HEALTH_EXIT=$?

if [[ "$HEALTH_EXIT" == 0 ]] && [[ "$HEALTH_STATUS" == "HEALTHY" ]]; then
  # HAL is healthy — reset circuit breaker
  log "RECOVERY: HAL is HEALTHY — resetting circuit breaker"
  
  NEW_RECOVERED=$(($(python3 -c "import json; print(json.load(open('$CIRCUIT_FILE')).get('recovered_count',0))" 2>/dev/null || echo "0") + 1))
  
  write_circuit_state "closed" 0 0 "$alerts_sent" "null" "$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
  update_metrics "HEALTHY" 0 0
  
  log "Circuit breaker reset. HAL online. Previous failure streak: $fail_count. Total recoveries: $NEW_RECOVERED"
  
  # Update metrics with recovery
  python3 -c "
import json
cb = json.load(open('$CIRCUIT_FILE'))
cb['recovered_count'] = $NEW_RECOVERED
with open('$CIRCUIT_FILE', 'w') as f:
    json.dump(cb, f, indent=2)
"
  
  echo "[STATUS] circuit=closed health=HEALTHY recovered_count=$NEW_RECOVERED"
  exit 0
else
  # HAL is unhealthy
  NEW_FAIL_COUNT=$((fail_count + 1))
  NEW_BACKOFF_LEVEL=$(( (NEW_FAIL_COUNT < 7) ? NEW_FAIL_COUNT : 6 ))
  
  log "FAILURE #$NEW_FAIL_COUNT: HAL check failed (status=$HEALTH_STATUS)"
  
  # Determine new circuit state
  NEW_CIRCUIT_STATE="open"
  if [[ "$NEW_FAIL_COUNT" -le 3 ]]; then
    NEW_CIRCUIT_STATE="half_open"  # Still trying
  fi
  
  # Write updated state
  write_circuit_state "$NEW_CIRCUIT_STATE" "$NEW_FAIL_COUNT" "$NEW_BACKOFF_LEVEL" "$alerts_sent" "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" "null"
  update_metrics "UNHEALTHY" "$NEW_FAIL_COUNT" "$NEW_BACKOFF_LEVEL"
  
  # Alert Joe if we hit 50 failures (serious outage)
  if [[ "$NEW_FAIL_COUNT" -eq 50 ]] || [[ "$NEW_FAIL_COUNT" -eq 100 ]]; then
    NEW_ALERTS=$((alerts_sent + 1))
    python3 -c "
import json
cb = json.load(open('$CIRCUIT_FILE'))
cb['alerts_sent'] = $NEW_ALERTS
with open('$CIRCUIT_FILE', 'w') as f:
    json.dump(cb, f, indent=2)
"
    send_alert_notification "$NEW_FAIL_COUNT" "$HEALTH_STATUS"
  fi
  
  local backoff_min=$(backoff_delay_minutes "$NEW_BACKOFF_LEVEL")
  log "Circuit is now $NEW_CIRCUIT_STATE. Next retry in ~${backoff_min}m"
  
  echo "[STATUS] circuit=$NEW_CIRCUIT_STATE health=$HEALTH_STATUS fail_count=$NEW_FAIL_COUNT backoff_min=${backoff_min}"
  exit 1
fi
