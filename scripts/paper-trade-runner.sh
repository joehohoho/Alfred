#!/bin/bash
# paper-trade-runner.sh — Background runner for paper trade sessions
# Runs every 15 min via LaunchAgent. Ticks all active paper trade sessions.
# Zero LLM cost — just HTTP calls to the market signals app API.

set -euo pipefail

LOG="$HOME/.openclaw/logs/paper-trade-runner.log"
AUDIT="$HOME/.openclaw/workspace/scripts/audit-log.sh"
APP_URL="http://localhost:3000/apps/market-signals/api/paper-trade"

ts() { date '+%Y-%m-%dT%H:%M:%S%z'; }
log() { echo "[$(ts)] $*" | tee -a "$LOG"; }

# Check if the market signals app is running
APP_STATUS=$(curl -s --max-time 5 -o /dev/null -w "%{http_code}" "http://localhost:3000/apps/market-signals/api/health" 2>/dev/null || echo "000")
if [[ "$APP_STATUS" != "200" ]]; then
  log "SKIP: Market signals app not responding (HTTP $APP_STATUS)"
  exit 0
fi

# Get all active sessions
SESSIONS=$(curl -s --max-time 10 "$APP_URL" 2>/dev/null)
if [[ -z "$SESSIONS" ]]; then
  log "SKIP: No response from paper trade API"
  exit 0
fi

ACTIVE_COUNT=$(echo "$SESSIONS" | python3 -c "
import json, sys
try:
    d = json.load(sys.stdin)
    sessions = d.get('sessions', d) if isinstance(d, dict) else d
    if isinstance(sessions, list):
        active = [s for s in sessions if s.get('status') == 'active']
        print(len(active))
    else:
        print(0)
except:
    print(0)
" 2>/dev/null || echo "0")

if [[ "$ACTIVE_COUNT" == "0" ]]; then
  # No active sessions — nothing to do (don't log to avoid noise)
  exit 0
fi

log "Processing $ACTIVE_COUNT active paper trade session(s)"

# Tick each active session
echo "$SESSIONS" | python3 -c "
import json, sys
d = json.load(sys.stdin)
sessions = d.get('sessions', d) if isinstance(d, dict) else d
if isinstance(sessions, list):
    for s in sessions:
        if s.get('status') == 'active':
            print(s.get('id', ''))
" 2>/dev/null | while read -r SESSION_ID; do
  [[ -z "$SESSION_ID" ]] && continue

  TICK_RESULT=$(curl -s --max-time 30 -X POST "$APP_URL" \
    -H "Content-Type: application/json" \
    -d "{\"action\":\"tick\",\"sessionId\":\"$SESSION_ID\"}" 2>/dev/null)

  if [[ -z "$TICK_RESULT" ]]; then
    log "  $SESSION_ID: tick failed (empty response)"
    continue
  fi

  # Parse the result
  python3 -c "
import json, sys

result = json.loads('''$TICK_RESULT''')
session = result.get('session', result)
sid = session.get('id', '$SESSION_ID')[:20]
symbol = session.get('symbol', '?')
balance = session.get('balance', 0)
pnl = session.get('totalPnl', 0)
pnl_pct = session.get('totalPnlPercent', 0)
pos = session.get('currentPosition')
signal = result.get('signal', 'none')
price = result.get('currentPrice', 0)
trades = len(session.get('trades', []))

parts = [f'{sid}: {symbol}']
parts.append(f'bal=\${balance:,.0f}')
parts.append(f'pnl=\${pnl:,.0f} ({pnl_pct:.1f}%)')
parts.append(f'trades={trades}')

if pos:
    entry = pos.get('entryPrice', 0)
    unrealized = (price - entry) / entry * 100 if entry > 0 else 0
    parts.append(f'POSITION: entry=\${entry:,.0f} unrealized={unrealized:.1f}%')

if signal and signal != 'none':
    parts.append(f'SIGNAL: {signal}')

print(' | '.join(parts))
" 2>/dev/null && log "  $(python3 -c "
import json
r = json.loads('''$TICK_RESULT''')
s = r.get('session', r)
sid = s.get('id','?')[:20]
sym = s.get('symbol','?')
pnl = s.get('totalPnl',0)
sig = r.get('signal','none')
pos = 'LONG' if s.get('currentPosition') else 'FLAT'
print(f'{sid}: {sym} pnl=\${pnl:,.0f} pos={pos} signal={sig}')
" 2>/dev/null)" || log "  $SESSION_ID: tick processed"

  # If a trade just executed, log to audit
  TRADE_COUNT=$(echo "$TICK_RESULT" | python3 -c "
import json, sys
r = json.load(sys.stdin)
print(r.get('newTrade', 'false'))
" 2>/dev/null || echo "false")

  if [[ "$TRADE_COUNT" != "false" && "$TRADE_COUNT" != "null" ]]; then
    TRADE_INFO=$(echo "$TICK_RESULT" | python3 -c "
import json, sys
r = json.load(sys.stdin)
s = r.get('session', r)
trades = s.get('trades', [])
if trades:
    t = trades[-1]
    entry = t.get('entry', t.get('entryPrice', 0))
    exit_p = t.get('exit', t.get('exitPrice', 0))
    pnl = t.get('pnl', 0)
    reason = t.get('reason', t.get('exitReason', 'signal'))
    print(f'{s.get(\"symbol\",\"?\")}: entry=\${entry:,.0f} exit=\${exit_p:,.0f} pnl=\${pnl:,.0f} reason={reason}')
" 2>/dev/null || echo "trade executed")
    bash "$AUDIT" info "paper-trade" "Trade executed: $TRADE_INFO" 2>/dev/null || true
  fi
done

log "Done"
