#!/usr/bin/env bash
# check-codex-auth.sh — Detect recurring openai-codex OAuth failures with deduped alerts

set -euo pipefail

WORKSPACE="$HOME/.openclaw/workspace"
LOG="$HOME/.openclaw/logs/gateway.err.log"
STATE_FILE="$WORKSPACE/memory/.codex-auth-state.json"
WINDOW_LINES=8000
MIN_FAILURES=3
COOLDOWN_SECONDS=$((12*60*60)) # 12h

mkdir -p "$(dirname "$STATE_FILE")"

if [[ ! -f "$LOG" ]]; then
  echo "No gateway error log found."
  exit 0
fi

# Count codex auth failures in recent log window (line-based approximation)
FAILURES=$(tail -n "$WINDOW_LINES" "$LOG" | grep -E -c "openai-codex.*Token refresh failed|OAuth token refresh failed for openai-codex" || true)

if [[ "$FAILURES" -lt "$MIN_FAILURES" ]]; then
  echo "✅ Codex auth OK (recent failures: $FAILURES)"
  exit 0
fi

NOW_EPOCH=$(date +%s)

# Default prior state
LAST_NOTIFIED_EPOCH=0
LAST_NOTIFIED_FAILURES=0

if [[ -f "$STATE_FILE" ]]; then
  LAST_NOTIFIED_EPOCH=$(python3 - <<PY
import json
try:
    with open("$STATE_FILE") as f:
        d=json.load(f)
    print(int(d.get("lastNotifiedEpoch",0)))
except Exception:
    print(0)
PY
)
  LAST_NOTIFIED_FAILURES=$(python3 - <<PY
import json
try:
    with open("$STATE_FILE") as f:
        d=json.load(f)
    print(int(d.get("lastNotifiedFailures",0)))
except Exception:
    print(0)
PY
)
fi

TIME_SINCE=$((NOW_EPOCH - LAST_NOTIFIED_EPOCH))
FAILURE_DELTA=$((FAILURES - LAST_NOTIFIED_FAILURES))

# Dedupe rule:
# notify if no prior alert, OR cooldown elapsed, OR failures increased by >=3 since last alert
if [[ "$LAST_NOTIFIED_EPOCH" -ne 0 && "$TIME_SINCE" -lt "$COOLDOWN_SECONDS" && "$FAILURE_DELTA" -lt 3 ]]; then
  echo "⚠️  Codex auth failing ($FAILURES) — deduped (cooldown active, delta=$FAILURE_DELTA)."
  exit 0
fi

bash "$WORKSPACE/scripts/send-notification.sh" \
  "alert" \
  "🔑 Codex OAuth Token Expired" \
  "Codex auth is failing repeatedly (recent failures: $FAILURES). Alfred is falling back to Claude Sonnet so work continues, but Codex capacity is unavailable.\n\nOptions:\n1) Re-authenticate Codex now\n2) Keep fallback active and re-auth later\n\nRecommendation: Re-auth when convenient to restore free Codex throughput." \
  "" "" "check-codex-auth"

python3 - <<PY
import json, time
state={
  "lastNotifiedEpoch": $NOW_EPOCH,
  "lastNotifiedFailures": $FAILURES,
  "updatedAt": int(time.time())
}
with open("$STATE_FILE","w") as f:
  json.dump(state,f)
PY

echo "🔔 Notification sent: Codex auth failure (recent occurrences: $FAILURES)"
