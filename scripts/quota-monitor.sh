#!/bin/bash
# quota-monitor.sh
# Daily quota monitoring — detects quota burn rate and alerts if projections bad
# Runs at 07:00 AM AST via cron

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE="${SCRIPT_DIR%/scripts}"
CONFIG="$WORKSPACE/HAL-QUOTA-CONFIG.json"
QUOTA_HISTORY="$WORKSPACE/.hal-spawn-logs/quota-history.jsonl"
QUOTA_ALERT="$WORKSPACE/.hal-spawn-logs/quota-alert.log"

mkdir -p "$WORKSPACE/.hal-spawn-logs"

ts() { date -u +%Y-%m-%dT%H:%M:%SZ; }
log() { echo "[$(ts)] $*" | tee -a "$QUOTA_ALERT"; }

# ─────────────────────────────────────────────────────────────────────────────
# READ CONFIG
# ─────────────────────────────────────────────────────────────────────────────

read_config() {
  jq -r "$1" "$CONFIG" 2>/dev/null || echo "$2"
}

ALERT_ACCEL_PCT=$(read_config '.monitoring.alert_if_consumption_accel_pct' '10')
ALERT_CONTEXT_PCT=$(read_config '.monitoring.alert_if_alfred_context_growth_pct' '5')
PROJECTION_DAYS=$(read_config '.monitoring.projection_days_ahead' '7')
QUOTA_LIMIT=$(read_config '.quota_gates.subscription_quota_limit_pct' '85')

# ─────────────────────────────────────────────────────────────────────────────
# FETCH CURRENT QUOTAS
# ─────────────────────────────────────────────────────────────────────────────

fetch_quotas() {
  local status_json
  status_json=$(curl -s http://localhost:3000/status 2>/dev/null || echo '{}')
  
  local quota_consumed=$(echo "$status_json" | jq '.usage.consumed_pct // 0' 2>/dev/null || echo "0")
  local alfred_context=$(session_status 2>/dev/null | jq '.context_usage_pct // 0' 2>/dev/null || echo "0")
  
  echo "$(ts) | quota_consumed=$quota_consumed | alfred_context=$alfred_context"
}

# ─────────────────────────────────────────────────────────────────────────────
# COMPUTE BURN RATE & PROJECTION
# ─────────────────────────────────────────────────────────────────────────────

analyze_burn_rate() {
  local current_quota=$(curl -s http://localhost:3000/status 2>/dev/null | jq '.usage.consumed_pct // 0' || echo "0")
  
  # Read last 7 days of history
  if [[ ! -f "$QUOTA_HISTORY" ]]; then
    log "First run: No history available. Baseline: $current_quota%"
    return 0
  fi
  
  # Extract last 7 days of quota readings
  python3 - "$PROJECTION_DAYS" "$current_quota" "$ALERT_ACCEL_PCT" "$QUOTA_LIMIT" <<'PY'
import sys, json, datetime
from collections import defaultdict

projection_days = int(sys.argv[1])
current_quota = float(sys.argv[2])
alert_accel_pct = float(sys.argv[3])
quota_limit = float(sys.argv[4])

now = datetime.datetime.utcnow()
cutoff = now - datetime.timedelta(days=7)

readings = []
try:
  with open(''"$QUOTA_HISTORY"'', 'r') as f:
    for line in f:
      try:
        d = json.loads(line)
        ts_str = d.get('timestamp', '')
        if ts_str.endswith('Z'):
          ts_str = ts_str[:-1] + '+00:00'
        t = datetime.datetime.fromisoformat(ts_str).replace(tzinfo=None)
        
        if t >= cutoff:
          readings.append((t, float(d.get('quota_consumed', current_quota))))
      except:
        pass
except:
  pass

if len(readings) < 2:
  print("[MONITOR] Insufficient history (need >= 2 readings). Baseline: {:.1f}%".format(current_quota))
  sys.exit(0)

readings.sort()
oldest_time, oldest_quota = readings[0]
newest_time, newest_quota = readings[-1]

# Compute burn rate (% per day)
delta_time = (newest_time - oldest_time).total_seconds() / 86400
delta_quota = newest_quota - oldest_quota
burn_rate = delta_quota / delta_time if delta_time > 0 else 0

print("[MONITOR] Quota history: {:.1f}% → {:.1f}% over {:.1f} days".format(oldest_quota, newest_quota, delta_time))
print("[MONITOR] Burn rate: {:.2f}% per day".format(burn_rate))

# Project forward
projected_quota = current_quota + (burn_rate * projection_days)
days_to_limit = (quota_limit - current_quota) / burn_rate if burn_rate > 0 else 999

print("[MONITOR] Projection (next {} days): {:.1f}%".format(projection_days, projected_quota))

# Alert conditions
if burn_rate > alert_accel_pct:
  print("[ALERT] QUOTA BURN ACCELERATING: {:.2f}% per day (threshold: {:.1f}%)".format(burn_rate, alert_accel_pct))
  print("[ALERT] At current rate, quota limit ({:.0f}%) will be hit in {:.1f} days".format(quota_limit, days_to_limit))
  print("[ACTION] Reduce HAL complexity or increase monitoring frequency")

if projected_quota > quota_limit:
  print("[ALERT] QUOTA PROJECTION BREACH: Will exceed {:.0f}% limit in {:.1f} days".format(quota_limit, days_to_limit))
  print("[ACTION] Consider quota reduction or schedule reduced HAL usage")

PY
}

# ─────────────────────────────────────────────────────────────────────────────
# CONTEXT GROWTH MONITORING
# ─────────────────────────────────────────────────────────────────────────────

check_alfred_context() {
  local alfred_context=$(session_status 2>/dev/null | jq '.context_usage_pct // 0' 2>/dev/null || echo "0")
  
  if (( $(echo "$alfred_context > 60" | bc -l 2>/dev/null || echo "0") )); then
    echo "[ALERT] Alfred context elevated: ${alfred_context}% (threshold: 60%)"
    echo "[ACTION] Monitor for context death risk. Compression cron may trigger."
  fi
}

# ─────────────────────────────────────────────────────────────────────────────
# MAIN MONITORING
# ─────────────────────────────────────────────────────────────────────────────

main() {
  log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  log "DAILY QUOTA MONITOR ($(date +%Y-%m-%d))"
  
  # Fetch current state
  log "$(fetch_quotas)"
  
  # Record to history
  local current=$(curl -s http://localhost:3000/status 2>/dev/null | jq '.usage.consumed_pct // 0' || echo "0")
  local alfred_ctx=$(session_status 2>/dev/null | jq '.context_usage_pct // 0' 2>/dev/null || echo "0")
  
  cat >> "$QUOTA_HISTORY" <<EOF
{"timestamp":"$(ts)","quota_consumed":$current,"alfred_context":$alfred_ctx}
EOF
  
  # Analyze trends
  analyze_burn_rate
  
  # Check Alfred context
  check_alfred_context
  
  # Summary
  log "MONITOR COMPLETE — Check $QUOTA_ALERT for details"
  log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

main "$@"
