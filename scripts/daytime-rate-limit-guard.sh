#!/bin/bash
# daytime-rate-limit-guard.sh
# Lightweight monitor for intraday Codex rate-limit spikes.
# Runs every 30 min via cron during business hours (9 AM - 6 PM AST).
# If >2 rate-limit errors detected in last 30 min, switch to Haiku + alert.
#
# Purpose: Avoid waiting until 8 AM recovery window; handle daytime rate limits immediately.
#
# Integration: Add to cron as:
#   */30 09-18 * * * bash ~/.openclaw/workspace/scripts/daytime-rate-limit-guard.sh >> ~/.openclaw/logs/daytime-rate-guard.log 2>&1

set -euo pipefail

ERR_LOG="$HOME/.openclaw/logs/gateway.err.log"
CONFIG="$HOME/.openclaw/openclaw.json"
GUARD_STATE="$HOME/.openclaw/workspace/.guard-state/daytime-rate-limit.json"
mkdir -p "$(dirname "$GUARD_STATE")"

ts() { date '+%Y-%m-%dT%H:%M:%S'; }
log() { echo "[$(ts)] DAYTIME-GUARD: $*"; }

# 1. Count Codex rate-limit errors in last 30 minutes
THRESHOLD_TIME=$(date -u -v-30M '+%Y-%m-%dT%H:%M:%S' 2>/dev/null || date -u -d '30 minutes ago' '+%Y-%m-%dT%H:%M:%S')
RATE_LIMIT_COUNT=$(grep -cE "rate limit reached|API rate limit|Provider rate limits|429|quota" "$ERR_LOG" 2>/dev/null || echo "0")
# Count recent errors (tail last 50 lines, filter for rate limits)
RECENT_COUNT=$(tail -50 "$ERR_LOG" 2>/dev/null | grep -cE "rate limit reached|API rate limit|Provider rate limits|429|quota" || echo "0")

log "Rate-limit check: $RECENT_COUNT errors in last 30 min (total: $RATE_LIMIT_COUNT)"

# 2. If threshold exceeded, switch to Haiku immediately
if [[ "$RECENT_COUNT" -gt 2 ]]; then
  log "⚠️ ALERT: $RECENT_COUNT rate-limit errors detected (threshold: 2)"

  # Read current config
  CURRENT_PRIMARY=$(python3 -c "
import json
with open('$CONFIG') as f:
    c = json.load(f)
print(c.get('agents', {}).get('defaults', {}).get('model', {}).get('primary', 'unknown'))
" 2>/dev/null || echo "unknown")

  if [[ "$CURRENT_PRIMARY" == "openai-codex/gpt-5.3-codex" ]]; then
    log "Switching from Codex to Haiku (rate-limit spike detected)"

    # Update config: Haiku primary, no fallbacks
    python3 -c "
import json
with open('$CONFIG') as f:
    c = json.load(f)
c['agents']['defaults']['model']['primary'] = 'anthropic/claude-haiku-4-5'
c['agents']['defaults']['model']['fallbacks'] = []
with open('$CONFIG', 'w') as f:
    json.dump(c, f, indent=2)
" 2>/dev/null

    # Restart gateway to apply change
    launchctl kickstart -k gui/$(id -u)/ai.openclaw.gateway 2>/dev/null || true
    sleep 3

    # Store incident state
    python3 -c "
import json, time
with open('$GUARD_STATE', 'w') as f:
    json.dump({
        'incident_at': int(time.time()),
        'recent_errors': $RECENT_COUNT,
        'switched_from': '$CURRENT_PRIMARY',
        'switched_to': 'anthropic/claude-haiku-4-5',
        'status': 'active'
    }, f)
" 2>/dev/null

    log "✅ Switched to Haiku (fallback active). Incident logged."

    # Optional: notify via curl to Command Center (best-effort)
    curl -s --max-time 5 -X POST "http://localhost:3001/api/notifications" \
      -H "Content-Type: application/json" \
      -d "{\"type\":\"warning\",\"title\":\"Codex Rate-Limit Detected\",\"message\":\"$RECENT_COUNT errors in 30 min. Switched to Haiku. Will auto-recover at 8 AM.\"}" \
      > /dev/null 2>&1 || log "Warning: Could not post notification (Command Center unavailable)"

  else
    log "Already using $CURRENT_PRIMARY — no action needed"
  fi

else
  log "✅ No rate-limit spike detected ($RECENT_COUNT errors)"

  # If we're in fallback mode and quota recovered, clear the incident
  if [[ -f "$GUARD_STATE" ]]; then
    STATUS=$(python3 -c "
import json
with open('$GUARD_STATE') as f:
    s = json.load(f)
print(s.get('status', 'unknown'))
" 2>/dev/null || echo "unknown")

    if [[ "$STATUS" == "active" ]]; then
      log "Rate-limit incident active — will stay on Haiku until 8 AM recovery"
    fi
  fi
fi
