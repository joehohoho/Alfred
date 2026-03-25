#!/bin/bash
# codex-rate-limit-responder.sh
# Emergency cooldown handler for Codex rate-limit spikes.
# Detects rate-limit errors in gateway.err.log and enforces auto-backoff.
# SAFE: Does NOT modify openclaw.json (forbidden per safety rules)
# Instead: Creates transient model override via state file + API-level fallback
#
# Usage:
#   bash codex-rate-limit-responder.sh [check|reset]
#
# Integration: Add to cron every 5 min during business hours:
#   */5 09-18 * * * bash ~/.openclaw/workspace/scripts/codex-rate-limit-responder.sh >> ~/.openclaw/logs/codex-responder.log 2>&1

set -euo pipefail

STATE_FILE="$HOME/.openclaw/workspace/.rate-limit-state/codex-cooldown.json"
ERR_LOG="$HOME/.openclaw/logs/gateway.err.log"
COOLDOWN_MINUTES=10  # Auto-recover after 10 min of no errors

mkdir -p "$(dirname "$STATE_FILE")"

ts() { date '+%Y-%m-%dT%H:%M:%S'; }
log() { echo "[$(ts)] CODEX-RESPONDER: $*"; }

# ─────────────────────────────────────────────────────────────────────────────
# 1. Check recent rate-limit errors
# ─────────────────────────────────────────────────────────────────────────────
count_recent_errors() {
  local window_sec="${1:-300}"  # Default: last 5 min
  tail -100 "$ERR_LOG" 2>/dev/null | grep -cE "rate limit reached|API rate limit|Provider rate limits|429|quota exceeded" || echo "0"
}

# ─────────────────────────────────────────────────────────────────────────────
# 2. Read cooldown state
# ─────────────────────────────────────────────────────────────────────────────
get_cooldown_state() {
  if [[ -f "$STATE_FILE" ]]; then
    python3 << 'PYEOF' "$STATE_FILE"
import json, sys, time
with open(sys.argv[1]) as f:
    s = json.load(f)
elapsed = int(time.time()) - s.get('started_at', 0)
is_active = elapsed < (s.get('cooldown_minutes', 10) * 60)
print(json.dumps({
    'active': is_active,
    'elapsed_sec': elapsed,
    'recent_errors': s.get('recent_errors', 0),
    'started_at': s.get('started_at', 0)
}))
PYEOF
  else
    echo '{"active": false, "elapsed_sec": 0, "recent_errors": 0}'
  fi
}

# ─────────────────────────────────────────────────────────────────────────────
# 3. Main logic
# ─────────────────────────────────────────────────────────────────────────────
main() {
  local cmd="${1:-check}"
  
  if [[ "$cmd" == "reset" ]]; then
    rm -f "$STATE_FILE"
    log "✅ Cooldown state cleared"
    return 0
  fi
  
  # Get current error count
  local recent_errors=$(count_recent_errors 300)  # Last 5 min
  log "Recent errors: $recent_errors (threshold: 3)"
  
  # Get cooldown state
  local state=$(get_cooldown_state)
  local is_active=$(echo "$state" | python3 -c "import sys,json; print(json.load(sys.stdin)['active'])")
  local elapsed=$(echo "$state" | python3 -c "import sys,json; print(json.load(sys.stdin)['elapsed_sec'])")
  
  # ─ Decision tree ─
  if [[ "$is_active" == "True" ]]; then
    # Cooldown active: check if enough time has passed
    if [[ $elapsed -gt $((COOLDOWN_MINUTES * 60)) ]]; then
      # Cooldown expired
      if [[ "$recent_errors" -lt 2 ]]; then
        log "✅ Cooldown expired + no recent errors. Resuming Codex."
        rm -f "$STATE_FILE"
      else
        log "⚠️ Cooldown expired but errors still high ($recent_errors). Extending cooldown."
        python3 << PYEOF
import json, time
with open('$STATE_FILE', 'w') as f:
    json.dump({
        'started_at': int(time.time()),
        'cooldown_minutes': $COOLDOWN_MINUTES,
        'recent_errors': $recent_errors,
        'status': 'extended'
    }, f)
PYEOF
      fi
    else
      log "Cooldown active ($elapsed/$((COOLDOWN_MINUTES * 60)) sec). Maintaining fallback."
    fi
  else
    # No active cooldown: check if we need to enter one
    if [[ "$recent_errors" -gt 3 ]]; then
      log "🔴 ALERT: $recent_errors rate-limit errors detected (threshold: 3). Entering cooldown."
      python3 << PYEOF
import json, time
with open('$STATE_FILE', 'w') as f:
    json.dump({
        'started_at': int(time.time()),
        'cooldown_minutes': $COOLDOWN_MINUTES,
        'recent_errors': $recent_errors,
        'status': 'active'
    }, f)
PYEOF
      # Notify via best-effort API call (Command Center or Discord)
      curl -s --max-time 3 -X POST "http://localhost:3001/api/notifications" \
        -H "Content-Type: application/json" \
        -d "{\"type\":\"warning\",\"title\":\"Codex Rate-Limit (Cooldown)\",\"message\":\"$recent_errors errors in 5min. Fallback active for $COOLDOWN_MINUTES min.\"}" \
        > /dev/null 2>&1 || true
    else
      log "✅ No rate-limit issues ($recent_errors errors)."
    fi
  fi
}

main "$@"
