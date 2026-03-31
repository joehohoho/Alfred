#!/bin/bash
# signal-trainer.sh — Automated training runner for Market Signals App
# Runs backtests across multiple symbols, strategies, and timeframes
# to build up the learned patterns database and improve signal quality.
#
# Runs every 6 hours via LaunchAgent. Zero LLM cost — just API calls.
# Each run tests ~30 combinations, building the pattern database.

set -euo pipefail

LOG="$HOME/.openclaw/logs/signal-trainer.log"
AUDIT="$HOME/.openclaw/workspace/scripts/audit-log.sh"
APP_URL="http://localhost:3000/apps/market-signals/api"

ts() { date '+%Y-%m-%dT%H:%M:%S%z'; }
log() { echo "[$(ts)] $*"; }

# Check if the app is running
APP_STATUS=$(curl -s --max-time 5 -o /dev/null -w "%{http_code}" "$APP_URL/health" 2>/dev/null || echo "000")
if [[ "$APP_STATUS" != "200" ]]; then
  log "SKIP: Market signals app not responding (HTTP $APP_STATUS)"
  exit 0
fi

log "=== Signal Trainer starting ==="

SYMBOLS=("BTC" "ETH")
STRATEGIES=("SMART" "SMA_RSI_IMPROVED" "MACD" "BOLLINGER_BANDS" "TREND_FOLLOWING")
TIMEFRAMES=(60 90 120 180 240 365)
RISK_CONFIGS=(
  '{"stopLoss":8,"trailingStop":5}'
  '{"stopLoss":12,"trailingStop":8}'
  '{"stopLoss":15,"trailingStop":10}'
)

TOTAL=0
PROFITABLE=0
BEST_PNL="-999999"
BEST_COMBO=""

# Rotate through combinations — don't run all every time (too slow)
# Use a round-robin index persisted to disk
INDEX_FILE="$HOME/.openclaw/workspace/.hal-alfred-tracking/trainer-index.txt"
ROUND_INDEX=0
[[ -f "$INDEX_FILE" ]] && ROUND_INDEX=$(cat "$INDEX_FILE" 2>/dev/null || echo "0")

COMBOS=()
for SYM in "${SYMBOLS[@]}"; do
  for STRAT in "${STRATEGIES[@]}"; do
    for DAYS in "${TIMEFRAMES[@]}"; do
      for RISK in "${RISK_CONFIGS[@]}"; do
        COMBOS+=("$SYM|$STRAT|$DAYS|$RISK")
      done
    done
  done
done

TOTAL_COMBOS=${#COMBOS[@]}
# Run 10 combinations per cycle (keeps each run under 5 min)
BATCH_SIZE=10
START=$((ROUND_INDEX % TOTAL_COMBOS))

log "Combos: $TOTAL_COMBOS total, running batch of $BATCH_SIZE starting at index $START"

for i in $(seq 0 $((BATCH_SIZE - 1))); do
  IDX=$(( (START + i) % TOTAL_COMBOS ))
  COMBO="${COMBOS[$IDX]}"
  IFS='|' read -r SYM STRAT DAYS RISK_JSON <<< "$COMBO"

  SL=$(echo "$RISK_JSON" | python3 -c "import json,sys; print(json.loads(sys.stdin.read()).get('stopLoss',8))" 2>/dev/null)
  TS=$(echo "$RISK_JSON" | python3 -c "import json,sys; print(json.loads(sys.stdin.read()).get('trailingStop',5))" 2>/dev/null)

  RESULT=$(curl -s --max-time 30 -X POST "$APP_URL/backtest" \
    -H "Content-Type: application/json" \
    -d "{\"symbol\":\"$SYM\",\"strategy\":\"$STRAT\",\"days\":$DAYS,\"investment\":10000,\"stopLoss\":$SL,\"trailingStop\":$TS}" 2>/dev/null)

  if [[ -z "$RESULT" ]]; then
    log "  [$IDX] $SYM/$STRAT/${DAYS}d SL=$SL TS=$TS — TIMEOUT"
    continue
  fi

  PNL=$(echo "$RESULT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('metrics',{}).get('totalPnLPercent',d.get('metrics',{}).get('totalPnL','ERR')))" 2>/dev/null)
  TRADES=$(echo "$RESULT" | python3 -c "import json,sys; print(json.load(sys.stdin).get('metrics',{}).get('totalTrades',0))" 2>/dev/null)
  WIN=$(echo "$RESULT" | python3 -c "import json,sys; print(json.load(sys.stdin).get('metrics',{}).get('winRate','?'))" 2>/dev/null)

  TOTAL=$((TOTAL + 1))

  # Check if profitable
  IS_PROFIT=$(echo "$PNL" | python3 -c "
import sys
try:
    v = float(sys.stdin.read().strip().replace('$','').replace(',','').replace('%',''))
    print('yes' if v > 0 else 'no')
except: print('no')
" 2>/dev/null)

  [[ "$IS_PROFIT" == "yes" ]] && PROFITABLE=$((PROFITABLE + 1))

  # Track best
  python3 -c "
pnl = '$PNL'.replace('\$','').replace(',','').replace('%','')
try:
    if float(pnl) > float('$BEST_PNL'):
        print('BEST')
    else:
        print('OK')
except: print('OK')
" 2>/dev/null | grep -q "BEST" && {
    BEST_PNL="$PNL"
    BEST_COMBO="$SYM/$STRAT/${DAYS}d SL=$SL TS=$TS"
  }

  ICON="✓"
  [[ "$IS_PROFIT" != "yes" ]] && ICON="✗"
  log "  [$IDX] $ICON $SYM/$STRAT/${DAYS}d SL=$SL TS=$TS — PnL=$PNL Win=$WIN Trades=$TRADES"
done

# Update round index for next run
echo $(( (START + BATCH_SIZE) % TOTAL_COMBOS )) > "$INDEX_FILE"

log "Batch complete: $TOTAL tested, $PROFITABLE profitable, best=$BEST_COMBO ($BEST_PNL)"

# Log to audit
bash "$AUDIT" info "signal-trainer" "Training batch: $TOTAL tested, $PROFITABLE profitable" --detail "best=$BEST_COMBO pnl=$BEST_PNL" 2>/dev/null || true

# Check learning stats
PATTERNS=$(curl -s --max-time 10 "$APP_URL/learning-stats?symbol=BTC" 2>/dev/null | python3 -c "
import json,sys
d=json.load(sys.stdin)
print(f'BTC patterns: {d.get(\"totalPatterns\",0)} total, {d.get(\"actionableLosingCount\",0)} blocking, trades={d.get(\"totalTradesAnalyzed\",0)}')
" 2>/dev/null || echo "stats unavailable")
log "Learning: $PATTERNS"

log "=== Signal Trainer done ==="
