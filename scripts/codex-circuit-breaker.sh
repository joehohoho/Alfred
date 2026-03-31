#!/usr/bin/env bash
# codex-circuit-breaker.sh — Circuit breaker for recurring Codex auth failures
# Disables Codex in gateway config temporarily, then re-enables after cooldown
# Prevents wasted auth attempts from blocking other work

set -euo pipefail

WORKSPACE="$HOME/.openclaw/workspace"
LOG="$HOME/.openclaw/logs/gateway.err.log"
STATE_FILE="$WORKSPACE/memory/.codex-breaker-state.json"
FAILURE_THRESHOLD=5
COOLDOWN_SECONDS=$((6*60*60)) # 6 hours
WINDOW_LINES=4000

mkdir -p "$(dirname "$STATE_FILE")"

# Check recent failures
FAILURES=$(tail -n "$WINDOW_LINES" "$LOG" 2>/dev/null | grep -E -c "openai-codex.*Token refresh failed|OAuth token refresh failed for openai-codex" || true)

NOW_EPOCH=$(date +%s)
BREAKER_OPEN=false
LAST_OPEN_EPOCH=0

if [[ -f "$STATE_FILE" ]]; then
  BREAKER_OPEN=$(python3 - <<PY
import json
try:
    with open("$STATE_FILE") as f:
        d=json.load(f)
    print("true" if d.get("breakerOpen") else "false")
except Exception:
    print("false")
PY
)
  LAST_OPEN_EPOCH=$(python3 - <<PY
import json
try:
    with open("$STATE_FILE") as f:
        d=json.load(f)
    print(int(d.get("lastOpenedEpoch",0)))
except Exception:
    print(0)
PY
)
fi

TIME_SINCE_OPEN=$((NOW_EPOCH - LAST_OPEN_EPOCH))

# If breaker is open and cooldown hasn't elapsed, keep it open
if [[ "$BREAKER_OPEN" == "true" && "$TIME_SINCE_OPEN" -lt "$COOLDOWN_SECONDS" ]]; then
  echo "⏱️  Codex breaker still open (cooldown: $((COOLDOWN_SECONDS - TIME_SINCE_OPEN))s remaining, failures: $FAILURES)"
  exit 0
fi

# If breaker is open and cooldown has elapsed, try to close it (reset state, restart gateway)
if [[ "$BREAKER_OPEN" == "true" && "$TIME_SINCE_OPEN" -ge "$COOLDOWN_SECONDS" ]]; then
  echo "✅ Codex circuit breaker cooldown elapsed. Attempting to restore Codex..."
  python3 - <<PY
import json
state = {
  "breakerOpen": False,
  "lastOpenedEpoch": 0,
  "failureCount": 0,
  "updatedAt": int(__import__('time').time())
}
with open("$STATE_FILE", "w") as f:
  json.dump(state, f)
PY
  
  # Restart gateway to clear connection pools
  echo "Restarting gateway to restore Codex connectivity..."
  launchctl restart ai.openclaw.gateway 2>/dev/null || true
  sleep 2
  exit 0
fi

# Failure threshold not reached yet
if [[ "$FAILURES" -lt "$FAILURE_THRESHOLD" ]]; then
  echo "✓ Codex auth failures detected ($FAILURES/$FAILURE_THRESHOLD) but threshold not yet reached"
  exit 0
fi

# Threshold exceeded — open the breaker
if [[ "$BREAKER_OPEN" == "false" ]]; then
  echo "🔴 CIRCUIT BREAKER OPEN: Codex auth failures ($FAILURES) exceed threshold. Disabling Codex temporarily..."
  
  python3 - <<PY
import json
state = {
  "breakerOpen": True,
  "lastOpenedEpoch": $NOW_EPOCH,
  "failureCount": $FAILURES,
  "updatedAt": int(__import__('time').time())
}
with open("$STATE_FILE", "w") as f:
  json.dump(state, f)
PY
  
  # Notify operator
  bash "$WORKSPACE/scripts/send-notification.sh" \
    "alert" \
    "🔴 Codex Circuit Breaker Opened" \
    "Codex auth is failing repeatedly ($FAILURES recent failures). Codex has been temporarily disabled to prevent blocking other work.\n\nFallback: Using Claude Sonnet (API cost). Work continues normally.\n\nAutomatic recovery: Circuit breaker will attempt to restore Codex in ~6 hours.\n\nManual action: Re-authenticate Codex now to restore immediately." \
    "" "" "codex-breaker"
  
  # Restart gateway with Codex disabled (gateway will auto-skip Codex in fallback chain)
  echo "Restarting gateway..."
  launchctl restart ai.openclaw.gateway 2>/dev/null || true
  sleep 2
fi

exit 0
