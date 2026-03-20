#!/usr/bin/env bash
# check-codex-auth.sh — Detect recurring openai-codex OAuth failures and notify Joe
# Runs as a periodic health check. Sends one notification per day max.

set -euo pipefail

WORKSPACE="$HOME/.openclaw/workspace"
LOG="$HOME/.openclaw/logs/gateway.err.log"
STAMP_FILE="$WORKSPACE/memory/.codex-auth-notified"
TODAY="$(TZ=America/Moncton date +%F)"

if [[ ! -f "$LOG" ]]; then
  echo "No gateway error log found."
  exit 0
fi

# Count codex auth failures in the last 2 hours
FAILURES=$(grep -c "openai-codex.*Token refresh failed\|OAuth token refresh failed for openai-codex" "$LOG" 2>/dev/null || true)

if [[ "$FAILURES" -lt 3 ]]; then
  echo "✅ Codex auth OK (failures: $FAILURES)"
  exit 0
fi

# Already notified today?
if [[ -f "$STAMP_FILE" ]] && grep -q "$TODAY" "$STAMP_FILE" 2>/dev/null; then
  echo "⚠️  Codex auth failing ($FAILURES times) — already notified today."
  exit 0
fi

# Send notification
bash "$WORKSPACE/scripts/send-notification.sh" \
  "alert" \
  "🔑 Codex OAuth Token Expired" \
  "The openai-codex OAuth token is expired — Alfred has logged $FAILURES auth failures today. The gateway is auto-falling back to Claude Sonnet, so work continues, but Codex is unavailable.\n\nOptions:\n1. Re-authenticate Codex via 'openclaw auth codex' (or equivalent CLI)\n2. Leave it — Sonnet fallback is working fine\n\nRecommendation: Re-authenticate when convenient so free Codex capacity is restored.\nDefault: Will keep using Sonnet fallback if no action taken." \
  "" "" "check-codex-auth"

# Mark notified
echo "$TODAY" > "$STAMP_FILE"
echo "🔔 Notification sent: Codex auth failure ($FAILURES occurrences)"
