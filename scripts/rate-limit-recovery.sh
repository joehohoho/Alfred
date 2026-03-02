#!/bin/bash
# rate-limit-recovery.sh
# One-shot script to re-enable everything after overnight rate limit recovery.
# Run by LaunchAgent at 8 AM AST, then self-removes the LaunchAgent.
#
# SAFE STARTUP ORDER (prevents cron stampede):
#   1. Reset circuit breaker
#   2. Clear error log
#   3. Restore Codex model
#   4. Start gateway (NO crons yet)
#   5. Test single API call to verify provider limits have reset
#   6. If test passes → re-enable crons
#   7. If test fails → leave crons disabled, re-schedule for later

set -euo pipefail

LOG="$HOME/.openclaw/logs/gateway-watchdog.log"
CB_FILE="$HOME/.openclaw/workspace/.hal-alfred-tracking/rate-limit-circuit-breaker.json"
JOBS_FILE="$HOME/.openclaw/cron/jobs.json"
PLIST="$HOME/Library/LaunchAgents/com.alfred.rate-limit-recovery.plist"
ERR_LOG="$HOME/.openclaw/logs/gateway.err.log"

ts() { date '+%Y-%m-%dT%H:%M:%S'; }
log() { echo "[$(ts)] RECOVERY: $*" >> "$LOG"; }

log "Starting rate limit recovery..."

# 1. Reset circuit breaker
python3 -c "
import json
with open('$CB_FILE', 'w') as f:
    json.dump({'tripped_at': 0, 'cooldown_min': 10, 'trip_count': 0, 'last_trip_at': 0, 'daily_errors': 0, 'daily_reset_at': 0}, f)
" 2>/dev/null
log "Circuit breaker reset"

# 2. Clear error log so watchdog starts clean
> "$ERR_LOG" 2>/dev/null || true
log "Error log cleared"

# 3. Restore Codex to fallback chain
openclaw models fallbacks add openai-codex/gpt-5.3-codex --position 0 2>/dev/null || true
openclaw models aliases remove default 2>/dev/null || true
log "Codex restored to fallback chain"

# 4. Start gateway (crons still disabled — no stampede)
launchctl enable gui/$(id -u)/ai.openclaw.gateway 2>/dev/null || true
launchctl kickstart gui/$(id -u)/ai.openclaw.gateway 2>/dev/null || true
sleep 10

GATEWAY_PID=$(pgrep -f "openclaw-gateway" 2>/dev/null | head -1 || true)
if [[ -z "$GATEWAY_PID" ]]; then
  log "FAILED: Gateway did not start — aborting recovery"
  curl -s -X POST "http://localhost:3001/api/notifications" \
    -H "Content-Type: application/json" \
    -d '{"type":"system","title":"Recovery Failed","message":"Gateway did not start. Manual intervention needed."}' \
    > /dev/null 2>&1 || true
  exit 1
fi
log "Gateway started (PID $GATEWAY_PID), crons still disabled"

# 5. Test API — send a lightweight request to verify providers have reset
sleep 5
TEST_RESULT=$(python3 -c "
import json, urllib.request, os

# Read auth profiles to get Codex token
path = os.path.join(os.environ['HOME'], '.openclaw', 'agents', 'main', 'agent', 'auth-profiles.json')
with open(path) as f:
    d = json.load(f)

# Test Codex
token = d['profiles']['openai-codex:default']['access']
req = urllib.request.Request(
    'https://api.openai.com/v1/chat/completions',
    data=json.dumps({'model': 'gpt-5.3-codex', 'messages': [{'role': 'user', 'content': 'hi'}], 'max_tokens': 5}).encode(),
    headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
)
try:
    resp = urllib.request.urlopen(req, timeout=15)
    r = json.loads(resp.read())
    if 'choices' in r:
        print('CODEX_OK')
    else:
        print('CODEX_FAIL')
except Exception as e:
    err = str(e)
    if 'quota' in err.lower() or 'rate' in err.lower():
        print('CODEX_RATE_LIMITED')
    else:
        print(f'CODEX_ERROR:{err[:80]}')
" 2>/dev/null || echo "CODEX_ERROR:python_failed")

log "API test result: $TEST_RESULT"

if [[ "$TEST_RESULT" == "CODEX_OK" ]]; then
  log "Codex API healthy — re-enabling crons"

  # 6. Re-enable crons (safe — API verified working)
  python3 -c "
import json
with open('$JOBS_FILE') as f:
    d = json.load(f)
count = 0
for j in d['jobs']:
    reason = j.get('_autoDisabledReason', '')
    if 'rate limit' in reason.lower() or 'Provider rate limits' in reason:
        j['enabled'] = True
        j.pop('_autoDisabledAt', None)
        j.pop('_autoDisabledReason', None)
        count += 1
with open('$JOBS_FILE', 'w') as f:
    json.dump(d, f, indent=2)
print(f'{count} crons re-enabled')
" 2>/dev/null
  log "All crons re-enabled"

  curl -s -X POST "http://localhost:3001/api/notifications" \
    -H "Content-Type: application/json" \
    -d '{"type":"system","title":"Rate Limit Recovery","message":"Full recovery complete: gateway running, Codex healthy, all crons re-enabled."}' \
    > /dev/null 2>&1 || true

elif [[ "$TEST_RESULT" == *"RATE_LIMITED"* ]] || [[ "$TEST_RESULT" == *"quota"* ]]; then
  log "Codex still rate limited — removing from fallbacks, using Anthropic only"

  # Remove Codex, keep Anthropic
  openclaw models fallbacks remove openai-codex/gpt-5.3-codex 2>/dev/null || true

  # Re-enable only essential crons (minimal API load on Anthropic)
  python3 -c "
import json
with open('$JOBS_FILE') as f:
    d = json.load(f)
essential = ['Webhook Listener - Check for Answers', 'Session Checkpoint (Memory Continuity)', 'Kanban Idle Loop']
count = 0
for j in d['jobs']:
    reason = j.get('_autoDisabledReason', '')
    if j['name'] in essential and ('rate limit' in reason.lower() or 'Provider rate limits' in reason):
        j['enabled'] = True
        j.pop('_autoDisabledAt', None)
        j.pop('_autoDisabledReason', None)
        count += 1
with open('$JOBS_FILE', 'w') as f:
    json.dump(d, f, indent=2)
print(f'{count} essential crons re-enabled')
" 2>/dev/null
  log "Only essential crons re-enabled (Codex still down)"

  curl -s -X POST "http://localhost:3001/api/notifications" \
    -H "Content-Type: application/json" \
    -d '{"type":"system","title":"Partial Recovery","message":"Gateway running on Anthropic only (Codex quota still exhausted). Essential crons enabled. Check platform.openai.com for quota reset."}' \
    > /dev/null 2>&1 || true

  # DON'T self-remove — keep the LaunchAgent to retry tomorrow
  log "Keeping recovery LaunchAgent for tomorrow retry"
  exit 0
else
  log "API test inconclusive ($TEST_RESULT) — enabling essential crons only"

  python3 -c "
import json
with open('$JOBS_FILE') as f:
    d = json.load(f)
essential = ['Webhook Listener - Check for Answers', 'Session Checkpoint (Memory Continuity)', 'Kanban Idle Loop']
count = 0
for j in d['jobs']:
    reason = j.get('_autoDisabledReason', '')
    if j['name'] in essential and ('rate limit' in reason.lower() or 'Provider rate limits' in reason):
        j['enabled'] = True
        j.pop('_autoDisabledAt', None)
        j.pop('_autoDisabledReason', None)
        count += 1
with open('$JOBS_FILE', 'w') as f:
    json.dump(d, f, indent=2)
print(f'{count} essential crons re-enabled')
" 2>/dev/null

  curl -s -X POST "http://localhost:3001/api/notifications" \
    -H "Content-Type: application/json" \
    -d '{"type":"system","title":"Partial Recovery","message":"Gateway running. API test inconclusive — only essential crons enabled. Monitor for errors."}' \
    > /dev/null 2>&1 || true

  # Keep LaunchAgent to retry
  log "Keeping recovery LaunchAgent for tomorrow retry"
  exit 0
fi

log "Full recovery complete"

# 7. Self-cleanup — only when fully recovered
launchctl unload "$PLIST" 2>/dev/null || true
rm -f "$PLIST" 2>/dev/null || true
log "Recovery LaunchAgent removed (one-shot complete)"
