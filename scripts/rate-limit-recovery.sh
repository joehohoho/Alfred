#!/bin/bash
# rate-limit-recovery.sh
# One-shot script to re-enable everything after overnight rate limit recovery.
# Run by LaunchAgent at 8 AM AST, then self-removes the LaunchAgent.
#
# SAFE STARTUP ORDER (prevents cron stampede):
#   1. Reset circuit breaker (including throttle state)
#   2. Clear error log
#   3. Start gateway (NO crons yet — they were throttled/disabled)
#   4. Test Codex API using FREE /v1/models endpoint (zero tokens consumed)
#   5. If Codex works → set Codex as primary + Haiku fallback, enable crons
#   6. If Codex fails → set Haiku as primary (no fallbacks), enable crons
#   7. Self-cleanup only on full Codex recovery; retry daily otherwise

set -euo pipefail

LOG="$HOME/.openclaw/logs/gateway-watchdog.log"
CB_FILE="$HOME/.openclaw/workspace/.hal-alfred-tracking/rate-limit-circuit-breaker.json"
JOBS_FILE="$HOME/.openclaw/cron/jobs.json"
PLIST="$HOME/Library/LaunchAgents/com.alfred.rate-limit-recovery.plist"
ERR_LOG="$HOME/.openclaw/logs/gateway.err.log"
CONFIG="$HOME/.openclaw/openclaw.json"

ts() { date '+%Y-%m-%dT%H:%M:%S'; }
log() { echo "[$(ts)] RECOVERY: $*" >> "$LOG"; }

log "Starting rate limit recovery..."

# 1. Reset circuit breaker (all fields including throttle)
python3 -c "
import json
with open('$CB_FILE', 'w') as f:
    json.dump({'tripped_at': 0, 'cooldown_min': 10, 'trip_count': 0, 'last_trip_at': 0, 'daily_errors': 0, 'daily_reset_at': 0, 'throttled_at': 0}, f)
" 2>/dev/null
log "Circuit breaker reset"

# 2. Clear error log so watchdog starts clean
> "$ERR_LOG" 2>/dev/null || true
log "Error log cleared"

# 3. Start gateway (crons still disabled — no stampede)
launchctl enable gui/$(id -u)/ai.openclaw.gateway 2>/dev/null || true
launchctl kickstart gui/$(id -u)/ai.openclaw.gateway 2>/dev/null || true
sleep 10

GATEWAY_PID=$(pgrep -f "openclaw-gateway" 2>/dev/null | head -1 || true)
if [[ -z "$GATEWAY_PID" ]]; then
  log "FAILED: Gateway did not start — aborting recovery"
  curl -s --max-time 10 -X POST "http://localhost:3001/api/notifications" \
    -H "Content-Type: application/json" \
    -d '{"type":"system","title":"Recovery Failed","message":"Gateway did not start. Manual intervention needed."}' \
    > /dev/null 2>&1 || true
  exit 1
fi
log "Gateway started (PID $GATEWAY_PID), crons still disabled"

# 4. Test Codex API — FREE /v1/models endpoint (no tokens consumed, no rate limit impact)
sleep 5
TEST_RESULT=$(python3 -c "
import json, urllib.request, os

# Read auth profiles to get Codex token
path = os.path.join(os.environ['HOME'], '.openclaw', 'agents', 'main', 'agent', 'auth-profiles.json')
with open(path) as f:
    d = json.load(f)

token = d['profiles']['openai-codex:default']['access']
req = urllib.request.Request(
    'https://api.openai.com/v1/models',
    headers={'Authorization': f'Bearer {token}'}
)
try:
    resp = urllib.request.urlopen(req, timeout=15)
    if resp.status == 200:
        print('CODEX_OK')
    else:
        print('CODEX_FAIL')
except Exception as e:
    err = str(e)
    if 'quota' in err.lower() or 'rate' in err.lower() or '429' in err or '403' in err:
        print('CODEX_QUOTA')
    else:
        print(f'CODEX_ERROR:{err[:80]}')
" 2>/dev/null || echo "CODEX_ERROR:python_failed")

log "Codex test result: $TEST_RESULT"

# 5. Re-enable ALL rate-limit-disabled AND throttled crons (skip PERMANENT ones)
REENABLED=$(python3 -c "
import json
with open('$JOBS_FILE') as f:
    d = json.load(f)
count = 0
for j in d['jobs']:
    reason = j.get('_autoDisabledReason', '')
    if reason.startswith('PERMANENT:'):
        continue
    if 'rate limit' in reason.lower() or 'Provider rate limits' in reason or reason == 'rate limit throttle':
        j['enabled'] = True
        j.pop('_autoDisabledAt', None)
        j.pop('_autoDisabledReason', None)
        count += 1
with open('$JOBS_FILE', 'w') as f:
    json.dump(d, f, indent=2)
print(count)
" 2>/dev/null || echo "0")
log "$REENABLED crons re-enabled (skipped PERMANENT)"

# 6. Set model configuration based on Codex test result
if [[ "$TEST_RESULT" == "CODEX_OK" ]]; then
  # FULL RECOVERY: Codex as primary, Haiku as fallback
  python3 -c "
import json
with open('$CONFIG') as f:
    c = json.load(f)
c['agents']['defaults']['model']['primary'] = 'openai-codex/gpt-5.3-codex'
c['agents']['defaults']['model']['fallbacks'] = ['anthropic/claude-haiku-4-5']
# Remove default alias (Codex is primary, no alias needed)
if 'anthropic/claude-haiku-4-5' in c['agents']['defaults'].get('models', {}):
    c['agents']['defaults']['models']['anthropic/claude-haiku-4-5'].pop('alias', None)
with open('$CONFIG', 'w') as f:
    json.dump(c, f, indent=2)
" 2>/dev/null
  log "FULL RECOVERY: Codex as primary, Haiku fallback, $REENABLED crons enabled"

  curl -s --max-time 10 -X POST "http://localhost:3001/api/notifications" \
    -H "Content-Type: application/json" \
    -d "{\"type\":\"system\",\"title\":\"Full Recovery\",\"message\":\"Codex primary, Haiku fallback, $REENABLED crons re-enabled.\"}" \
    > /dev/null 2>&1 || true

  # Restart gateway to pick up model change
  launchctl kickstart -k gui/$(id -u)/ai.openclaw.gateway 2>/dev/null || true
  sleep 5

  # Self-cleanup — only when fully recovered
  launchctl unload "$PLIST" 2>/dev/null || true
  rm -f "$PLIST" 2>/dev/null || true
  log "Recovery LaunchAgent removed (one-shot complete)"

else
  # PARTIAL RECOVERY: Haiku as primary, no fallbacks (Codex is useless while quota-blocked)
  python3 -c "
import json
with open('$CONFIG') as f:
    c = json.load(f)
c['agents']['defaults']['model']['primary'] = 'anthropic/claude-haiku-4-5'
c['agents']['defaults']['model']['fallbacks'] = []
# Set default alias for good measure
if 'anthropic/claude-haiku-4-5' in c['agents']['defaults'].get('models', {}):
    c['agents']['defaults']['models']['anthropic/claude-haiku-4-5']['alias'] = 'default'
with open('$CONFIG', 'w') as f:
    json.dump(c, f, indent=2)
" 2>/dev/null
  log "PARTIAL: Codex unavailable ($TEST_RESULT) — Haiku as primary, no fallbacks"

  # Restart gateway to pick up model change
  launchctl kickstart -k gui/$(id -u)/ai.openclaw.gateway 2>/dev/null || true
  sleep 5

  curl -s --max-time 10 -X POST "http://localhost:3001/api/notifications" \
    -H "Content-Type: application/json" \
    -d "{\"type\":\"system\",\"title\":\"Partial Recovery\",\"message\":\"Codex still down ($TEST_RESULT). Haiku primary. $REENABLED crons enabled. Retry tomorrow 8 AM.\"}" \
    > /dev/null 2>&1 || true

  # Keep LaunchAgent — retry tomorrow
  log "Keeping recovery LaunchAgent for tomorrow retry"
  exit 0
fi

log "Recovery complete"
